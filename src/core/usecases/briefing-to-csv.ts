import { toCsv, type CsvCell } from "../format/csv";
import type { Briefing } from "../domain/briefing";
import type { Signal } from "../domain/signal";
import { ALERT_STATE_LABELS, DECISION_STATUS_LABELS, DIMENSION_LABELS, PESTEL_FACTOR_LABELS, SEVERITY_LABELS } from "../labels";
import { bogotaDateKey } from "../time/bogota";
import { type BriefingPestelExtras, describeCounts, describeImpacts, openDecisions } from "./build-pestel";

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

function row(kind: "aviso" | "estado de aviso", signal: Signal, state: string, date: string, note: string): CsvCell[] {
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

/** One row per aviso and one per aviso state. Text cells starting with a formula character are neutralized. */
export function briefingToCsv(briefing: Briefing, extras?: BriefingPestelExtras): string {
  const signalRows = briefing.sections.flatMap((section) =>
    section.signals.map((signal) => row("aviso", signal, "", bogotaDateKey(signal.occurredAt), "")),
  );
  const alertRows = briefing.alerts.map((alert) =>
    row("estado de aviso", alert.signalSnapshot, ALERT_STATE_LABELS[alert.state].toLowerCase(), bogotaDateKey(alert.updatedAt), alert.note ?? ""),
  );
  return toCsv(BRIEFING_CSV_COLUMNS, [...signalRows, ...alertRows, ...(extras ? pestelRows(extras) : [])], {
    neutralizeFormulas: true,
  });
}

/** One row per PESTEL factor and one per open decision, under the same columns. */
function pestelRows({ pestel, decisions }: BriefingPestelExtras): CsvCell[][] {
  const factorRows = pestel.map((factor): CsvCell[] => [
    "lectura PESTEL",
    "",
    "",
    "",
    "",
    PESTEL_FACTOR_LABELS[factor.pestel],
    [describeCounts(factor), describeImpacts(factor) && `Impacto según la regla: ${describeImpacts(factor)}`, factor.trend.label]
      .filter(Boolean)
      .join(" · "),
    "El factor de cada aviso sale de la regla que lo generó",
    "",
    "",
    "",
    "",
  ]);
  const decisionRows = openDecisions(decisions).map((decision): CsvCell[] => [
    "decisión abierta",
    "",
    "",
    DECISION_STATUS_LABELS[decision.status].toLowerCase(),
    decision.reviewAt ?? "",
    decision.title,
    decision.question,
    decision.pestelFactors.map((factor) => PESTEL_FACTOR_LABELS[factor]).join("; "),
    "",
    "",
    "",
    decision.rationale,
  ]);
  return [...factorRows, ...decisionRows];
}
