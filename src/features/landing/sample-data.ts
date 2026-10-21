/** Static sample data for the landing mockup. Nothing here comes from a real source. */

export interface SamplePoint {
  fecha: string;
  valor: number;
}

/** 30 deterministic daily points around a round value, so the chart always looks the same. */
export const SAMPLE_TRM: SamplePoint[] = Array.from({ length: 30 }, (_, i) => {
  const day = new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
  const wave = Math.sin(i / 3.2) * 38 + Math.cos(i / 1.7) * 14;
  return { fecha: day, valor: Math.round(4000 + wave + i * 2.5) };
});

export const SAMPLE_STATS = [
  { id: "trm", label: "TRM hoy", meta: "Ejemplo", value: "$ 4.000", delta: 0.42, hint: "Día anterior: $ 3.983" },
  { id: "alertas", label: "Alertas nuevas", meta: "Ejemplo", value: "3", hint: "Contratación: 1 · Competidores: 1 · Macroeconomía: 1" },
  { id: "vencer", label: "Contratos por vencer", meta: "Ejemplo", value: "2", hint: "Contratos que terminan pronto" },
  { id: "competidores", label: "Contratos de competidores", meta: "Ejemplo", value: "1", hint: "Firmados en el periodo reciente" },
] as const;

export const SAMPLE_ALERTS = [
  { id: "a1", dimension: "macro", severity: "watch", title: "La TRM se movió más que el umbral definido", origin: "Superfinanciera" },
  { id: "a2", dimension: "procurement", severity: "alert", title: "Un contrato público está cerca de su fecha de fin", origin: "SECOP II" },
  { id: "a3", dimension: "competitors", severity: "info", title: "Un competidor firmó un contrato nuevo", origin: "SECOP II" },
] as const;
