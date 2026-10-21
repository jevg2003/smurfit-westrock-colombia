import { z } from "zod";
import type { Pestel } from "@/core/domain/dimension";

const TITLE_REQUIRED = "Escribe un título para la decisión.";
const RATIONALE_REQUIRED = "Escribe el motivo para marcar la decisión como decidida o descartada.";

const factors = z.array(z.custom<Pestel>((value) => typeof value === "string"));
const title = z.string().trim().min(1, TITLE_REQUIRED);

/** New decision: only the title is mandatory. */
export const createDecisionSchema = z.object({
  title,
  question: z.string(),
  factors,
});

const option = z.object({ id: z.string(), label: z.string(), pros: z.string(), cons: z.string() });

/** Edit form: everything except the status, which has its own form and its own rule. */
export const detailsSchema = z.object({
  title,
  question: z.string(),
  factors,
  options: z.array(option),
  linked: z.array(z.string()),
  owner: z.string(),
  /** Empty, or a calendar day `YYYY-MM-DD`. */
  reviewAt: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Elige una fecha válida."),
});

/** A rationale is required to mark a decision decided or discarded. */
export const statusSchema = z
  .object({
    status: z.enum(["open", "evaluating", "decided", "discarded"]),
    rationale: z.string(),
    chosen: z.string().optional(),
  })
  .refine((value) => !(value.status === "decided" || value.status === "discarded") || value.rationale.trim() !== "", {
    message: RATIONALE_REQUIRED,
    path: ["rationale"],
  });

export type DetailsValues = z.infer<typeof detailsSchema>;
export type StatusValues = z.infer<typeof statusSchema>;
