import { useMemo, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { KpiCard } from "./components/layout/KpiCard";
import { EstadoCarga } from "./components/ui/EstadoCarga";
import { EstadoError } from "./components/ui/EstadoError";
import "./components/ui/estados.css";
import { LoginForm } from "./features/auth/LoginForm";
import { useAuth } from "./features/auth/useAuth";
import { TrmChart } from "./features/trm/TrmChart";
import { TrmTable } from "./features/trm/TrmTable";
import { useTrm } from "./features/trm/useTrm";
import { useAlertas } from "./features/senales/useAlertas";
import { exportarCsv } from "./lib/csv";
import { formatCop } from "./lib/money";
import "./App.css";

const OPCIONES_PERIODO = [
  { label: "Últimos 30 días", dias: 30 },
  { label: "Últimos 90 días", dias: 90 },
  { label: "Últimos 180 días", dias: 180 },
  { label: "Último año", dias: 365 },
];

function App() {
  const { autenticado, iniciarSesion, cerrarSesion } = useAuth();
  const [dias, setDias] = useState(180);
  const { data: trm, isLoading, isError, error, refetch } = useTrm(dias);
  const { idsGuardados, alternar, estaGuardado } = useAlertas();

  const kpis = useMemo(() => {
    if (!trm || trm.length === 0) return null;
    const ultimo = trm[trm.length - 1];
    const maximo = Math.max(...trm.map((p) => p.valor));
    const atipicos = trm.filter((p) => p.atipico).length;
    return { ultimo, maximo, atipicos };
  }, [trm]);

  if (!autenticado) {
    return <LoginForm onIniciarSesion={iniciarSesion} />;
  }

  return (
    <AppShell onCerrarSesion={cerrarSesion}>
      {kpis && (
        <div className="kpi-row">
          <KpiCard etiqueta="TRM hoy" valor={formatCop(kpis.ultimo.valor)} nota={formatCopFecha(kpis.ultimo.fecha)} />
          <KpiCard
            etiqueta="Variación vs. día anterior"
            valor={kpis.ultimo.variacionPct !== null ? `${kpis.ultimo.variacionPct.toFixed(2)}%` : "—"}
          />
          <KpiCard etiqueta="Máximo del período" valor={formatCop(kpis.maximo)} />
          <KpiCard etiqueta="Días con variación atípica" valor={String(kpis.atipicos)} />
          <KpiCard etiqueta="Alertas guardadas" valor={String(idsGuardados.length)} />
        </div>
      )}

      <div className="seccion-header">
        <h2 className="seccion-titulo">Histórico</h2>
        <select value={dias} onChange={(e) => setDias(Number(e.target.value))}>
          {OPCIONES_PERIODO.map((opcion) => (
            <option key={opcion.dias} value={opcion.dias}>
              {opcion.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <EstadoCarga mensaje="Consultando la TRM en datos.gov.co…" />}

      {isError && (
        <EstadoError
          mensaje={error instanceof Error ? error.message : "error desconocido"}
          onReintentar={() => refetch()}
        />
      )}

      {trm && (
        <>
          <TrmChart datos={trm} />

          <section>
            <div className="seccion-header">
              <h2 className="seccion-titulo">Días y variaciones</h2>
              <button
                type="button"
                className="boton-secundario"
                onClick={() => exportarCsv(trm, "trm-smurfit-westrock.csv")}
              >
                Exportar CSV
              </button>
            </div>
            <TrmTable datos={trm} estaGuardado={estaGuardado} onAlternarAlerta={alternar} />
          </section>
        </>
      )}
    </AppShell>
  );
}

function formatCopFecha(fecha: string): string {
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(fecha));
}

export default App;
