import { describe, expect, it } from "vitest";
import { skipAnswerFor } from "./skip";
import type { Answer, Question } from "./schemas";

const question: Question = { id: "q1", block: "empresa", kind: "text", prompt: "¿Qué hace?", why: "Para entenderla." };
const answered: Answer = { questionId: "q1", block: "empresa", prompt: "¿Qué hace?", selected: [], text: "Cajas", skipped: false };
const skipped: Answer = { ...answered, text: "", skipped: true };

describe("skipAnswerFor", () => {
  it("lets a question that was never answered be skipped", () => {
    expect(skipAnswerFor(question, undefined)).toEqual({ questionId: "q1", block: "empresa", prompt: "¿Qué hace?", selected: [], text: "", skipped: true });
  });

  it("refuses to skip a question that already has an answer", () => {
    expect(skipAnswerFor(question, answered)).toBeNull();
  });

  it("refuses to skip a question that was already skipped once", () => {
    expect(skipAnswerFor(question, skipped)).toBeNull();
  });
});
