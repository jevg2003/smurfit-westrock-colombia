import type { OnboardingDraft } from "./draft";
import type { AiBlock, Answer, OnboardingRequest } from "./schemas";

export type NextAction = { type: "show"; cursor: number } | { type: "request"; block: AiBlock } | { type: "confirm" };

/**
 * What follows the question on screen once it is answered (or the seed once it is saved): a question already
 * stored is shown again without asking the AI, so editing an earlier answer never loses the later ones.
 */
export function nextAction(draft: Pick<OnboardingDraft, "questions" | "cursor" | "blocksDone">): NextAction {
  const position = draft.questions.length === 0 ? -1 : draft.cursor;
  if (draft.questions[position + 1]) return { type: "show", cursor: position + 1 };

  const block: AiBlock = position < 0 ? "empresa" : draft.questions[position].block;
  if (!draft.blocksDone[block]) return { type: "request", block };
  if (block === "empresa" && !draft.blocksDone.objetivos) return { type: "request", block: "objetivos" };
  return { type: "confirm" };
}

/** The request for the AI: the seed and every current answer in question order. */
export function buildRequest(draft: Pick<OnboardingDraft, "seed" | "questions" | "answers">, block: AiBlock): OnboardingRequest {
  if (!draft.seed) throw new Error("El borrador no tiene los datos iniciales.");
  const answers = draft.questions.flatMap((question): Answer[] => (draft.answers[question.id] ? [draft.answers[question.id]] : []));
  return { seed: draft.seed, block, answers };
}
