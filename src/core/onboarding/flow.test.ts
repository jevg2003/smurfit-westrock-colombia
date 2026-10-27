import { describe, expect, it } from "vitest";
import type { OnboardingDraft } from "./draft";
import { blockOf, stepNumberOf } from "./draft";
import { buildRequest, nextAction } from "./flow";
import type { Answer, Question } from "./schemas";

const question = (id: string, block: "empresa" | "objetivos"): Question => ({ id, block, kind: "text", prompt: `¿${id}?`, why: "Porque sí." });
const answer = (q: Question, text = "x"): Answer => ({ questionId: q.id, block: q.block, prompt: q.prompt, selected: [], text, skipped: false });

const draft = (patch: Partial<OnboardingDraft> = {}): OnboardingDraft => ({
  seed: { name: "Acme" },
  stage: "questions",
  questions: [],
  answers: {},
  cursor: 0,
  blocksDone: { empresa: false, objetivos: false },
  patch: {},
  updatedAt: "2026-10-27T10:00:00.000Z",
  ...patch,
});

describe("nextAction", () => {
  it("asks for the first empresa question right after the seed", () => {
    expect(nextAction(draft())).toEqual({ type: "request", block: "empresa" });
  });

  it("shows the question after the cursor when it is already stored, without a new request", () => {
    const [a, b] = [question("a", "empresa"), question("b", "empresa")];
    expect(nextAction(draft({ questions: [a, b], cursor: 0 }))).toEqual({ type: "show", cursor: 1 });
  });

  it("asks for more of the same block while it is not done", () => {
    const a = question("a", "empresa");
    expect(nextAction(draft({ questions: [a], cursor: 0 }))).toEqual({ type: "request", block: "empresa" });
  });

  it("moves on to objetivos when empresa is done", () => {
    const a = question("a", "empresa");
    expect(nextAction(draft({ questions: [a], cursor: 0, blocksDone: { empresa: true, objetivos: false } }))).toEqual({ type: "request", block: "objetivos" });
  });

  it("goes to the confirm step when objetivos is done", () => {
    const [a, b] = [question("a", "empresa"), question("b", "objetivos")];
    expect(nextAction(draft({ questions: [a, b], cursor: 1, blocksDone: { empresa: true, objetivos: true } }))).toEqual({ type: "confirm" });
  });

  it("does not re-request a done block when the user edited an earlier answer", () => {
    const [a, b] = [question("a", "empresa"), question("b", "objetivos")];
    expect(nextAction(draft({ questions: [a, b], cursor: 0, blocksDone: { empresa: true, objetivos: false } }))).toEqual({ type: "show", cursor: 1 });
  });
});

describe("buildRequest", () => {
  it("sends the seed and every current answer, in question order, for the block asked", () => {
    const [a, b] = [question("a", "empresa"), question("b", "empresa")];
    const request = buildRequest(draft({ questions: [b, a], answers: { a: answer(a, "uno"), b: answer(b, "dos") } }), "empresa");
    expect(request.block).toBe("empresa");
    expect(request.answers.map((item) => item.text)).toEqual(["dos", "uno"]);
  });

  it("leaves out answers of questions that were never answered", () => {
    const [a, b] = [question("a", "empresa"), question("b", "empresa")];
    expect(buildRequest(draft({ questions: [a, b], answers: { a: answer(a) } }), "empresa").answers).toHaveLength(1);
  });

  it("throws without a seed", () => {
    expect(() => buildRequest(draft({ seed: null }), "empresa")).toThrow();
  });
});

describe("blockOf and stepNumberOf", () => {
  it("maps the stage and the current question to the three steps", () => {
    const q = question("a", "objetivos");
    expect(stepNumberOf(blockOf(draft({ stage: "seed" })))).toBe(1);
    expect(stepNumberOf(blockOf(draft({ questions: [q], cursor: 0 })))).toBe(2);
    expect(stepNumberOf(blockOf(draft({ stage: "confirm" })))).toBe(3);
  });
});
