import { skippedAnswer } from "./answer-form";
import type { Answer, Question } from "./schemas";

/** Whether skipping is offered: only while the question has no stored answer, given or skipped. */
export const canSkip = (stored: Answer | undefined): boolean => stored === undefined;

/**
 * The answer that skipping a question stores, or null when skipping is not allowed. A question can be skipped
 * only the first time it is shown: once it has any stored answer (given or skipped), coming back to it with
 * Back must not offer the skip again, and a stale call must not overwrite what is there.
 */
export function skipAnswerFor(question: Pick<Question, "id" | "block" | "prompt">, stored: Answer | undefined): Answer | null {
  return canSkip(stored) ? skippedAnswer(question) : null;
}
