import type { Briefing } from "../domain/briefing";
import type { Signal } from "../domain/signal";
import { ALERT_STATE_LABELS, DIMENSION_LABELS, SEVERITY_LABELS } from "../labels";
import { bogotaDateKey } from "../time/bogota";

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
export function briefingToMarkdown(briefing: Briefing): string {
  const lines = [
    "# Briefing del entorno",
    "",
    `Período: ${bogotaDateKey(briefing.periodFrom)} al ${bogotaDateKey(briefing.periodTo)} (hora de Bogotá)`,
    `Generado: ${briefing.generatedAt}`,
    "",
    `> ${briefing.note}`,
    "",
  ];

  if (briefing.sections.length === 0) lines.push("Sin señales en este período.", "");
  for (const section of briefing.sections) {
    lines.push(`## ${DIMENSION_LABELS[section.dimension]}`, "");
    for (const signal of section.signals) lines.push(...signalBlock(signal));
  }

  if (briefing.alerts.length > 0) {
    lines.push("## Alertas", "");
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
