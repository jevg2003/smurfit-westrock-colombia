import { describe, expect, it } from "vitest";
import { progressOf, type OnboardingDraft } from "./draft";
import type { Answer, Question } from "./schemas";

const question = (id: string, block: "empresa" | "objetivos"): Question => ({ id, block, kind: "text", prompt: `${id}?`, why: "Porque sí." });
const answer = (q: Question): Answer => ({ questionId: q.id, block: q.block, prompt: q.prompt, selected: [], text: "x", skipped: false });

const draft = (patch: Partial<OnboardingDraft> = {}): OnboardingDraft => ({
  seed: null,
  stage: "seed",
  questions: [],
  answers: {},
  cursor: 0,
  blocksDone: { empresa: false, objetivos: false },
  patch: {},
  updatedAt: "2026-10-27T10:00:00.000Z",
  ...patch,
});

describe("progressOf", () => {
  it("starts above zero at the seed and ends at 100 on the confirm step", () => {
    expect(progressOf(draft())).toBeGreaterThan(0);
    expect(progressOf(draft({ stage: "confirm" }))).toBe(100);
  });

  it("grows with each answered question and never goes down when moving forward", () => {
    const [a, b, c] = [question("a", "empresa"), question("b", "empresa"), question("c", "objetivos")];
    const steps = [
      draft({ stage: "questions", questions: [a] }),
      draft({ stage: "questions", questions: [a, b], answers: { a: answer(a) } }),
      draft({ stage: "questions", questions: [a, b, c], cursor: 2, answers: { a: answer(a), b: answer(b) } }),
      draft({ stage: "questions", questions: [a, b, c], cursor: 2, answers: { a: answer(a), b: answer(b), c: answer(c) } }),
    ].map(progressOf);
    expect(steps).toEqual([...steps].sort((x, y) => x - y));
    expect(new Set(steps).size).toBe(steps.length);
    expect(steps.at(-1)).toBeLessThan(100);
  });
});
