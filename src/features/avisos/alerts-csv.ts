import { toCsv } from "@/core/format/csv";
import { ALERT_STATE_LABELS, DIMENSION_LABELS, SEVERITY_LABELS } from "@/core/labels";
import { bogotaDateKey } from "@/core/time/bogota";
import { PESTEL_LABELS } from "@/features/entorno/labels";
import type { AlertRow } from "./alert-row";

export const ALERTS_CSV_COLUMNS = [
  "estado",
  "severidad",
  "dimension",
  "pestel",
  "fecha",
  "titulo",
  "detalle",
  "regla",
  "fuente",
  "licencia",
  "enlace",
  "nota",
] as const;

/** One row per alert or signal, as the table shows it. Text that starts like a formula is neutralized. */
export function alertRowsToCsv(rows: readonly AlertRow[]): string {
  return toCsv(
    ALERTS_CSV_COLUMNS,
    rows.map(({ signal, alert }) => {
      const source = signal.provenance[0];
      return [
        ALERT_STATE_LABELS[alert.state],
        SEVERITY_LABELS[signal.severity],
        DIMENSION_LABELS[signal.dimension],
        PESTEL_LABELS[signal.pestel],
        bogotaDateKey(signal.occurredAt),
        signal.title,
        signal.detail,
        signal.ruleText,
        source?.attribution ?? "",
        source?.license ?? "",
        source?.url ?? "",
        alert.note ?? "",
      ];
    }),
    { neutralizeFormulas: true },
  );
}
