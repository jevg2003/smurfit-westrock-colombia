import type { Pestel } from "./dimension";
import type { Result } from "./result";

export type DecisionStatus = "open" | "evaluating" | "decided" | "discarded";

export interface DecisionOption {
  id: string;
  label: string;
  /** Free text, one point per line. */
  pros: string;
  cons: string;
}

/** A business decision the user is weighing, linked to environment signals. */
export interface Decision {
  id: string;
  title: string;
  question: string;
  pestelFactors: Pestel[];
  linkedSignalIds: string[];
  options: DecisionOption[];
  status: DecisionStatus;
  chosenOption?: string;
  /** Required to mark the decision as decided or discarded. */
  rationale: string;
  owner?: string;
  createdAt: string;
  updatedAt: string;
  /** Calendar day (YYYY-MM-DD) to look at this decision again. */
  reviewAt?: string;
}

export interface DecisionError {
  kind: "rationale_required" | "invalid_transition" | "unknown_option";
  message: string;
}

const ALLOWED_TARGETS: Record<DecisionStatus, DecisionStatus[]> = {
  open: ["evaluating", "decided", "discarded"],
  evaluating: ["open", "decided", "discarded"],
  decided: ["open", "evaluating"],
  discarded: ["open", "evaluating"],
};

export interface StatusChangeInput {
  rationale?: string;
  chosenOption?: string;
}

/**
 * Pure status change. A rationale is required to mark a decision decided or discarded, and a
 * chosen option, when given, must be one of its options. `now` is the ISO instant of the change.
 */
export function changeDecisionStatus(
  decision: Decision,
  status: DecisionStatus,
  { rationale, chosenOption }: StatusChangeInput,
  now: string,
): Result<Decision, DecisionError> {
  if (!ALLOWED_TARGETS[decision.status].includes(status)) {
    return { ok: false, error: { kind: "invalid_transition", message: "Este cambio de estado no está permitido." } };
  }

  const closing = status === "decided" || status === "discarded";
  const cleanRationale = (rationale ?? decision.rationale).trim();
  if (closing && cleanRationale === "") {
    return {
      ok: false,
      error: { kind: "rationale_required", message: "Escribe el motivo para marcar la decisión como decidida o descartada." },
    };
  }
  if (chosenOption !== undefined && !decision.options.some((option) => option.id === chosenOption)) {
    return { ok: false, error: { kind: "unknown_option", message: "La opción elegida no existe en esta decisión." } };
  }

  return {
    ok: true,
    value: {
      ...decision,
      status,
      rationale: cleanRationale,
      chosenOption: chosenOption ?? decision.chosenOption,
      updatedAt: now,
    },
  };
}

/** Trims option text and drops options without a label. */
export function normalizeOptions(options: readonly DecisionOption[]): DecisionOption[] {
  return options
    .map((option) => ({ ...option, label: option.label.trim(), pros: option.pros.trim(), cons: option.cons.trim() }))
    .filter((option) => option.label !== "");
}
