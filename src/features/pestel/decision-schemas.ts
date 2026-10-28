import { z } from "zod";
import { freeText, requiredText } from "@/core/company/fields";
import type { Pestel } from "@/core/domain/dimension";

const TITLE_REQUIRED = "Escriba un título para la decisión.";
const OPTION_REQUIRED = "Escriba el nombre de la opción.";
const RATIONALE_REQUIRED = "Escriba el motivo para marcar la decisión como decidida o descartada.";

/** Limits of the decision fields. They are enforced here and read by the fields (maxLength and counters). */
export const TITLE_MAX = 120;
export const QUESTION_MAX = 500;
export const OPTION_LABEL_MAX = 80;
export const OPTION_TEXT_MAX = 300;
export const OWNER_MAX = 80;
export const RATIONALE_MAX = 1000;

const factors = z.array(z.custom<Pestel>((value) => typeof value === "string"));
const title = requiredText(TITLE_MAX, TITLE_REQUIRED);
const question = freeText(QUESTION_MAX);

/** New decision: only the title is mandatory. */
export const createDecisionSchema = z.object({
  title,
  question,
  factors,
});

const option = z.object({
  id: z.string(),
  label: requiredText(OPTION_LABEL_MAX, OPTION_REQUIRED),
  pros: freeText(OPTION_TEXT_MAX),
  cons: freeText(OPTION_TEXT_MAX),
});

/** Edit form: everything except the status, which has its own form and its own rule. */
export const detailsSchema = z.object({
  title,
  question,
  factors,
  options: z.array(option),
  linked: z.array(z.string()),
  owner: freeText(OWNER_MAX),
  /** Empty, or a calendar day `YYYY-MM-DD`. */
  reviewAt: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Elija una fecha válida."),
});

const chosen = z.string().optional();

/** Open or evaluating: the rationale is optional. */
const undecidedStatusSchema = z.object({
  status: z.enum(["open", "evaluating"]),
  rationale: freeText(RATIONALE_MAX),
  chosen,
});

/** A rationale is required to mark a decision decided or discarded. */
const settledStatusSchema = z.object({
  status: z.enum(["decided", "discarded"]),
  rationale: requiredText(RATIONALE_MAX, RATIONALE_REQUIRED),
  chosen,
});

export const statusSchema = z.discriminatedUnion("status", [undecidedStatusSchema, settledStatusSchema]);

/** The branch of the status schema for a status, so a field can read its own rules (the rationale is required only when settled). */
export const statusSchemaFor = (status: DecisionStatusValue) => (status === "decided" || status === "discarded" ? settledStatusSchema : undecidedStatusSchema);

type DecisionStatusValue = "open" | "evaluating" | "decided" | "discarded";

export type DetailsValues = z.infer<typeof detailsSchema>;
export type StatusValues = { status: DecisionStatusValue; rationale: string; chosen?: string };
