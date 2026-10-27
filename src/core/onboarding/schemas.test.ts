import { describe, expect, it } from "vitest";
import {
  MAX_QUESTIONS_PER_BLOCK,
  answerSchema,
  onboardingRequestSchema,
  onboardingResponseSchema,
  questionSchema,
  seedSchema,
} from "./schemas";
import { createCompanyProfile } from "@/core/company/profile";

const question = { id: "q1", block: "empresa", kind: "single", prompt: "¿A qué sector pertenece?", why: "Define las búsquedas.", options: ["Alimentos", "Energía"], allowOther: true };
const answer = { questionId: "q1", block: "empresa", prompt: "¿A qué sector pertenece?", selected: ["Alimentos"], text: "", skipped: false };

describe("seedSchema", () => {
  it("requires a name and accepts an optional digits-only NIT and city", () => {
    expect(seedSchema.safeParse({ name: "  Acme SAS ", nit: "900123456", city: "Cali" }).success).toBe(true);
    expect(seedSchema.safeParse({ name: "Acme" }).success).toBe(true);
    expect(seedSchema.safeParse({ name: "" }).success).toBe(false);
    expect(seedSchema.safeParse({ name: "Acme", nit: "900.123.456-7" }).success).toBe(false);
  });

  it("rejects unknown keys", () => {
    expect(seedSchema.safeParse({ name: "Acme", extra: 1 }).success).toBe(false);
  });
});

describe("questionSchema", () => {
  it("accepts single, multi and text questions", () => {
    expect(questionSchema.safeParse(question).success).toBe(true);
    expect(questionSchema.safeParse({ ...question, kind: "multi" }).success).toBe(true);
    expect(questionSchema.safeParse({ id: "q2", block: "objetivos", kind: "text", prompt: "¿Qué desea lograr?", why: "Define las prioridades.", maxChars: 400 }).success).toBe(true);
  });

  it("requires options for choice questions and rejects an unknown kind", () => {
    expect(questionSchema.safeParse({ ...question, options: undefined }).success).toBe(false);
    expect(questionSchema.safeParse({ ...question, options: [] }).success).toBe(false);
    expect(questionSchema.safeParse({ ...question, kind: "slider" }).success).toBe(false);
  });
});

describe("onboardingRequestSchema", () => {
  const base = { seed: { name: "Acme" }, block: "empresa", answers: [answer] };

  it("accepts a bounded request", () => {
    expect(onboardingRequestSchema.safeParse(base).success).toBe(true);
  });

  it("rejects the confirm block, extra keys and oversized answers", () => {
    expect(onboardingRequestSchema.safeParse({ ...base, block: "confirmar" }).success).toBe(false);
    expect(onboardingRequestSchema.safeParse({ ...base, extra: true }).success).toBe(false);
    expect(onboardingRequestSchema.safeParse({ ...base, answers: [{ ...answer, text: "x".repeat(2001) }] }).success).toBe(false);
    expect(onboardingRequestSchema.safeParse({ ...base, answers: Array.from({ length: 21 }, () => answer) }).success).toBe(false);
  });

  it("limits the questions per block to a total of eight", () => {
    expect(MAX_QUESTIONS_PER_BLOCK.empresa + MAX_QUESTIONS_PER_BLOCK.objetivos).toBe(8);
  });
});

describe("answerSchema", () => {
  it("trims text and defaults nothing silently", () => {
    expect(answerSchema.parse({ ...answer, text: "  Otra  " }).text).toBe("Otra");
    expect(answerSchema.safeParse({ questionId: "q1" }).success).toBe(false);
  });
});

describe("onboardingResponseSchema", () => {
  it("accepts a question with a partial patch and a source", () => {
    const parsed = onboardingResponseSchema.safeParse({ nextQuestion: question, profilePatch: { sector: "Alimentos" }, source: "ai" });
    expect(parsed.success).toBe(true);
  });

  it("accepts a null question with a notice", () => {
    const parsed = onboardingResponseSchema.safeParse({
      nextQuestion: null,
      profilePatch: {},
      source: "fallback",
      notice: { code: "ai_unavailable", message: "La IA no respondió." },
    });
    expect(parsed.success).toBe(true);
  });
});

describe("CompanyProfile.sector", () => {
  it("is optional and kept by createCompanyProfile", () => {
    const profile = createCompanyProfile({ name: "Acme", sector: "Alimentos" }, { id: "a", now: new Date("2026-10-27T00:00:00Z") });
    expect(profile.sector).toBe("Alimentos");
    expect(createCompanyProfile({ name: "Acme" }, { id: "b", now: new Date() }).sector).toBeUndefined();
  });
});
