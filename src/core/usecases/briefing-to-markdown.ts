import type { Briefing } from "../domain/briefing";
import type { Signal } from "../domain/signal";
import { ALERT_STATE_LABELS, DECISION_STATUS_LABELS, DIMENSION_LABELS, PESTEL_FACTOR_LABELS, SEVERITY_LABELS } from "../labels";
import { bogotaDateKey } from "../time/bogota";
import { type BriefingPestelExtras, describeCounts, describeImpacts, openDecisions } from "./build-pestel";

/** External text is shown as plain text: markdown control characters are escaped, lines are joined. */
function plain(text: string): string {
  return text.replace(/\s+/g, " ").replace(/([\\`*_[\]<>#|])/g, "\\$1").trim();
}

function signalBlock(signal: Signal): string[] {
  const source = signal.provenance[0];
  return [
    `### ${plain(signal.title)}`,
    `- Severidad: ${SEVERITY_LABELS[signal.severity]}`,
    `- Fecha: ${bogotaDateKey(signal.occurredAt)}`,
    `- Detalle: ${plain(signal.detail)}`,
    `- Regla: ${plain(signal.ruleText)}`,
    ...(source
      ? [
          `- Fuente: ${plain(source.attribution)} · Licencia: ${plain(source.license)} · Consultado: ${bogotaDateKey(source.fetchedAt)}`,
          `- Enlace: ${source.url}`,
        ]
      : []),
    "",
  ];
}

/** Briefing as Markdown, ready to print or paste. Built only from the briefing data. */
export function briefingToMarkdown(briefing: Briefing, extras?: BriefingPestelExtras): string {
  const lines = [
    "# Briefing del entorno",
    "",
    `Período: ${bogotaDateKey(briefing.periodFrom)} al ${bogotaDateKey(briefing.periodTo)} (hora de Bogotá)`,
    `Generado: ${briefing.generatedAt}`,
    "",
    `> ${briefing.note}`,
    "",
  ];

  if (briefing.sections.length === 0) lines.push("Sin avisos en este período.", "");
  for (const section of briefing.sections) {
    lines.push(`## ${DIMENSION_LABELS[section.dimension]}`, "");
    for (const signal of section.signals) lines.push(...signalBlock(signal));
  }

  if (extras) lines.push(...pestelLines(extras));

  if (briefing.alerts.length > 0) {
    lines.push("## Estado de los avisos", "");
    for (const alert of briefing.alerts) {
      const snapshot = alert.signalSnapshot;
      lines.push(
        `- ${ALERT_STATE_LABELS[alert.state]} · ${plain(snapshot.title)} (${SEVERITY_LABELS[snapshot.severity]}, actualizada el ${bogotaDateKey(alert.updatedAt)})` +
          (alert.note ? ` — Nota: ${plain(alert.note)}` : ""),
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

function pestelLines({ pestel, decisions }: BriefingPestelExtras): string[] {
  const lines = [
    "## Lectura PESTEL",
    "",
    "> El factor de cada aviso sale de la regla que lo generó. La tendencia compara conteos con el período anterior de igual duración; no es un pronóstico.",
    "",
  ];
  for (const factor of pestel) {
    lines.push(`### ${PESTEL_FACTOR_LABELS[factor.pestel]}`, "", describeCounts(factor), "");
    if (factor.total === 0) continue;
    const impacts = describeImpacts(factor);
    if (impacts) lines.push(`Impacto según la regla: ${impacts}`, "");
    lines.push(factor.trend.label, "");
    for (const signal of factor.top) {
      const source = signal.provenance[0];
      lines.push(
        `- ${plain(signal.title)} (${SEVERITY_LABELS[signal.severity]}, ${bogotaDateKey(signal.occurredAt)})` +
          (source ? ` · Fuente: ${plain(source.attribution)} · Enlace: ${source.url}` : ""),
      );
    }
    lines.push("");
  }

  const open = openDecisions(decisions);
  if (open.length > 0) {
    lines.push("## Decisiones abiertas", "");
    for (const decision of open) {
      const factors = decision.pestelFactors.map((factor) => PESTEL_FACTOR_LABELS[factor]).join(", ");
      lines.push(
        `- ${plain(decision.title)} · ${DECISION_STATUS_LABELS[decision.status]}` +
          (factors ? ` · ${factors}` : "") +
          (decision.reviewAt ? ` · Revisar el ${decision.reviewAt}` : "") +
          (decision.question ? ` — ${plain(decision.question)}` : ""),
      );
    }
    lines.push("");
  }
  return lines;
}
