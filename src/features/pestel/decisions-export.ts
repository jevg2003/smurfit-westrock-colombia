import { toCsv } from "@/core/format/csv";
import type { Decision } from "@/core/domain/decision";
import { DECISION_STATUS_LABELS } from "@/core/labels";
import { bogotaDateKey } from "@/core/time/bogota";
import { PESTEL_LABELS } from "@/features/entorno/labels";

export const DECISION_CSV_COLUMNS = [
  "titulo",
  "pregunta",
  "factores_pestel",
  "estado",
  "opcion_elegida",
  "motivo",
  "responsable",
  "revisar_el",
  "senales_vinculadas",
  "creada",
  "actualizada",
] as const;

const chosenLabel = (decision: Decision) =>
  decision.options.find((option) => option.id === decision.chosenOption)?.label ?? "";

/** One row per decision. Text cells starting with a formula character are neutralized. */
export function decisionsToCsv(decisions: readonly Decision[]): string {
  return toCsv(
    DECISION_CSV_COLUMNS,
    decisions.map((decision) => [
      decision.title,
      decision.question,
      decision.pestelFactors.map((factor) => PESTEL_LABELS[factor]).join("; "),
      DECISION_STATUS_LABELS[decision.status],
      chosenLabel(decision),
      decision.rationale,
      decision.owner ?? "",
      decision.reviewAt ?? "",
      decision.linkedSignalIds.join("; "),
      bogotaDateKey(decision.createdAt),
      bogotaDateKey(decision.updatedAt),
    ]),
    { neutralizeFormulas: true },
  );
}

/** User text is shown as plain text: markdown control characters are escaped, lines are joined. */
const plain = (text: string) => text.replace(/\s+/g, " ").replace(/([\\`*_[\]<>#|])/g, "\\$1").trim();

export function decisionsToMarkdown(decisions: readonly Decision[]): string {
  const lines = ["# Decisiones", ""];
  if (decisions.length === 0) lines.push("Sin decisiones registradas.", "");

  for (const decision of decisions) {
    lines.push(
      `## ${plain(decision.title)}`,
      "",
      `- Estado: ${DECISION_STATUS_LABELS[decision.status]}`,
      `- Factores PESTEL: ${decision.pestelFactors.map((factor) => PESTEL_LABELS[factor]).join(", ") || "ninguno"}`,
      `- Pregunta: ${plain(decision.question)}`,
    );
    if (decision.owner) lines.push(`- Responsable: ${plain(decision.owner)}`);
    if (decision.reviewAt) lines.push(`- Revisar el: ${decision.reviewAt}`);
    if (decision.rationale) lines.push(`- Motivo: ${plain(decision.rationale)}`);
    if (decision.linkedSignalIds.length > 0) lines.push(`- Señales vinculadas: ${decision.linkedSignalIds.join(", ")}`);
    lines.push("", "Opciones:", "");
    if (decision.options.length === 0) lines.push("- Sin opciones registradas.");
    for (const option of decision.options) {
      lines.push(`- ${plain(option.label)}${option.id === decision.chosenOption ? " (elegida)" : ""}`);
      if (option.pros) lines.push(`  - A favor: ${plain(option.pros)}`);
      if (option.cons) lines.push(`  - En contra: ${plain(option.cons)}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
