import { toCsv, type CsvCell } from "../format/csv";
import type { Briefing } from "../domain/briefing";
import type { Signal } from "../domain/signal";
import { ALERT_STATE_LABELS, DIMENSION_LABELS, SEVERITY_LABELS } from "../labels";
import { bogotaDateKey } from "../time/bogota";

export const BRIEFING_CSV_COLUMNS = [
  "tipo",
  "dimension",
  "severidad",
  "estado",
  "fecha",
  "titulo",
  "detalle",
  "regla",
  "fuente",
  "licencia",
  "enlace",
  "nota",
] as const;

function row(kind: "señal" | "alerta", signal: Signal, state: string, date: string, note: string): CsvCell[] {
  const source = signal.provenance[0];
  return [
    kind,
    DIMENSION_LABELS[signal.dimension],
    SEVERITY_LABELS[signal.severity],
    state,
    date,
    signal.title,
    signal.detail,
    signal.ruleText,
    source?.attribution ?? "",
    source?.license ?? "",
    source?.url ?? "",
    note,
  ];
}

/** One row per signal and one per alert. Text cells starting with a formula character are neutralized. */
export function briefingToCsv(briefing: Briefing): string {
  const signalRows = briefing.sections.flatMap((section) =>
    section.signals.map((signal) => row("señal", signal, "", bogotaDateKey(signal.occurredAt), "")),
  );
  const alertRows = briefing.alerts.map((alert) =>
    row("alerta", alert.signalSnapshot, ALERT_STATE_LABELS[alert.state].toLowerCase(), bogotaDateKey(alert.updatedAt), alert.note ?? ""),
  );
  return toCsv(BRIEFING_CSV_COLUMNS, [...signalRows, ...alertRows], { neutralizeFormulas: true });
}
