import { describe, expect, it } from "vitest";
import type { Answer, Question } from "@/core/onboarding/schemas";
import { ONBOARDING_DRAFT_KEY, createOnboardingDraftStore } from "./onboarding-draft.store";
import { createFakeClock, createMemoryStorage } from "./test-utils";

const q1: Question = { id: "q1", block: "empresa", kind: "text", prompt: "¿Qué clientes tiene?", why: "Define el mercado." };
const q2: Question = { id: "q2", block: "objetivos", kind: "single", prompt: "¿Qué desea?", why: "Define metas.", options: ["Crecer", "Exportar"] };
const answerTo = (question: Question, patch: Partial<Answer> = {}): Answer => ({
  questionId: question.id,
  block: question.block,
  prompt: question.prompt,
  selected: [],
  text: "",
  skipped: false,
  ...patch,
});

function setup(initial: Record<string, string> = {}) {
  const storage = createMemoryStorage(initial);
  const clock = createFakeClock();
  const store = createOnboardingDraftStore({ storage, clock });
  return { storage, clock, store, state: () => store.getState() };
}

const persisted = (storage: ReturnType<typeof createMemoryStorage>) => JSON.parse(storage.data.get(ONBOARDING_DRAFT_KEY) ?? "null")?.state?.draft;

describe("onboarding draft store", () => {
  it("starts with no draft and begins one at the seed stage", () => {
    const { state } = setup();
    expect(state().draft).toBeNull();
    state().start();
    expect(state().draft).toMatchObject({ stage: "seed", seed: null, questions: [], cursor: 0 });
  });

  it("saves the seed and moves to the questions", () => {
    const { state } = setup();
    state().start();
    state().saveSeed({ name: "Acme SAS", nit: "900123456" });
    expect(state().draft).toMatchObject({ stage: "questions", seed: { name: "Acme SAS", nit: "900123456" } });
  });

  it("persists every answer immediately", () => {
    const { state, storage } = setup();
    state().start();
    state().saveSeed({ name: "Acme" });
    state().addQuestion(q1);
    state().saveAnswer(answerTo(q1, { text: "Retail" }));
    expect(persisted(storage).answers.q1.text).toBe("Retail");
  });

  it("resumes exactly where the user was after a reload", async () => {
    const first = setup();
    first.state().start();
    first.state().saveSeed({ name: "Acme" });
    first.state().addQuestion(q1);
    first.state().saveAnswer(answerTo(q1, { text: "Retail" }));
    first.state().addQuestion(q2);

    const reloaded = createOnboardingDraftStore({ storage: first.storage, clock: first.clock });
    await reloaded.persist.rehydrate();
    expect(reloaded.getState().draft).toEqual(first.state().draft);
    expect(reloaded.getState().draft?.cursor).toBe(1);
  });

  it("replaces the old draft when starting again", () => {
    const { state } = setup();
    state().start();
    state().saveSeed({ name: "Vieja" });
    state().addQuestion(q1);
    state().start();
    expect(state().draft).toMatchObject({ seed: null, questions: [], answers: {}, stage: "seed" });
  });

  it("does not add a question twice and points the cursor at it", () => {
    const { state } = setup();
    state().start();
    state().saveSeed({ name: "Acme" });
    state().addQuestion(q1);
    state().addQuestion(q2);
    state().addQuestion(q1);
    expect(state().draft?.questions.map((question) => question.id)).toEqual(["q1", "q2"]);
    expect(state().draft?.cursor).toBe(0);
  });

  it("goes back and edits an earlier answer without losing later ones", () => {
    const { state } = setup();
    state().start();
    state().saveSeed({ name: "Acme" });
    state().addQuestion(q1);
    state().saveAnswer(answerTo(q1, { text: "Retail" }));
    state().addQuestion(q2);
    state().saveAnswer(answerTo(q2, { selected: ["Crecer"] }));
    state().goTo(0);
    state().saveAnswer(answerTo(q1, { text: "Mayorista" }));
    expect(state().draft?.cursor).toBe(0);
    expect(state().draft?.answers.q1.text).toBe("Mayorista");
    expect(state().draft?.answers.q2.selected).toEqual(["Crecer"]);
    expect(state().draft?.questions).toHaveLength(2);
  });

  it("goes back from the first question to the seed and returns without losing questions", () => {
    const { state } = setup();
    state().start();
    state().saveSeed({ name: "Acme" });
    state().addQuestion(q1);
    state().goBack();
    expect(state().draft?.stage).toBe("seed");
    state().saveSeed({ name: "Acme SAS" });
    expect(state().draft).toMatchObject({ stage: "questions", cursor: 0, seed: { name: "Acme SAS" } });
    expect(state().draft?.questions).toHaveLength(1);
  });

  it("goes back from confirm to the last question", () => {
    const { state } = setup();
    state().start();
    state().saveSeed({ name: "Acme" });
    state().addQuestion(q1);
    state().addQuestion(q2);
    state().toConfirm();
    expect(state().draft?.stage).toBe("confirm");
    state().goBack();
    expect(state().draft).toMatchObject({ stage: "questions", cursor: 1 });
  });

  it("merges patches, keeping what earlier ones set", () => {
    const { state } = setup();
    state().start();
    state().applyPatch({ sector: "Alimentos" });
    state().applyPatch({ competitors: [{ name: "Alpina" }] });
    state().applyPatch({ sector: "Lácteos" });
    expect(state().draft?.patch).toEqual({ sector: "Lácteos", competitors: [{ name: "Alpina" }] });
  });

  it("marks blocks as done and stamps updatedAt from the clock", () => {
    const { state, clock } = setup();
    state().start();
    clock.set("2026-10-21T08:00:00.000Z");
    state().markBlockDone("empresa");
    expect(state().draft?.blocksDone).toEqual({ empresa: true, objetivos: false });
    expect(state().draft?.updatedAt).toBe("2026-10-21T08:00:00.000Z");
  });

  it("clears the draft", () => {
    const { state, storage } = setup();
    state().start();
    state().clear();
    expect(state().draft).toBeNull();
    expect(persisted(storage)).toBeNull();
  });

  it("drops a corrupt saved draft instead of breaking", async () => {
    const { store } = setup({ [ONBOARDING_DRAFT_KEY]: JSON.stringify({ state: { draft: { stage: "nope", questions: "x" } }, version: 1 }) });
    await store.persist.rehydrate();
    expect(store.getState().draft).toBeNull();
  });
});
