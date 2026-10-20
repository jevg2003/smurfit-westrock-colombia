"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const OPCIONES_PERIODO = [
  { value: "30", label: "Últimos 30 días" },
  { value: "90", label: "Últimos 90 días" },
  { value: "180", label: "Últimos 180 días" },
  { value: "365", label: "Último año" },
];

interface PeriodoContexto {
  dias: number;
  setDias: (dias: number) => void;
}

const PeriodoContext = createContext<PeriodoContexto | null>(null);

export function PeriodoProvider({ children }: { children: ReactNode }) {
  const [dias, setDias] = useState(180);
  return <PeriodoContext value={{ dias, setDias }}>{children}</PeriodoContext>;
}

export function usePeriodo(): PeriodoContexto {
  const contexto = useContext(PeriodoContext);
  if (!contexto) throw new Error("usePeriodo debe usarse dentro de PeriodoProvider");
  return contexto;
}

export function PeriodoSelect() {
  const { dias, setDias } = usePeriodo();

  return (
    <Select items={OPCIONES_PERIODO} value={String(dias)} onValueChange={(valor) => setDias(Number(valor))}>
      <SelectTrigger size="sm" className="w-44" aria-label="Período">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPCIONES_PERIODO.map((opcion) => (
          <SelectItem key={opcion.value} value={opcion.value}>
            {opcion.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
