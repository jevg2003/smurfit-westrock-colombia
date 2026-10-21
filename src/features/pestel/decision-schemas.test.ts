import { describe, expect, it } from "vitest";
import { createDecisionSchema, detailsSchema, statusSchema } from "./decision-schemas";

const messages = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message) ?? [];

describe("createDecisionSchema", () => {
  it("asks for a title", () => {
    const result = createDecisionSchema.safeParse({ title: "   ", question: "", factors: [] });
    expect(result.success).toBe(false);
    expect(messages(result)).toEqual(["Escribe un título para la decisión."]);
  });

  it("accepts a title with an empty question", () => {
    expect(createDecisionSchema.safeParse({ title: "Cubrir el dólar", question: "", factors: [] }).success).toBe(true);
  });
});

describe("statusSchema", () => {
  it.each(["decided", "discarded"] as const)("requires a rationale to mark %s", (status) => {
    const result = statusSchema.safeParse({ status, rationale: "  ", chosen: undefined });
    expect(result.success).toBe(false);
    expect(messages(result)).toEqual(["Escribe el motivo para marcar la decisión como decidida o descartada."]);
  });

  it("does not need a rationale for open or evaluating", () => {
    expect(statusSchema.safeParse({ status: "evaluating", rationale: "", chosen: undefined }).success).toBe(true);
    expect(statusSchema.safeParse({ status: "decided", rationale: "Lo exige la norma", chosen: undefined }).success).toBe(true);
  });
});

describe("detailsSchema", () => {
  const base = { title: "T", question: "", factors: [], options: [], linked: [], owner: "", reviewAt: "" };

  it("accepts an empty optional date and a valid day key", () => {
    expect(detailsSchema.safeParse(base).success).toBe(true);
    expect(detailsSchema.safeParse({ ...base, reviewAt: "2026-11-05" }).success).toBe(true);
  });

  it("rejects a broken date and an empty title", () => {
    expect(messages(detailsSchema.safeParse({ ...base, reviewAt: "05/11/2026" }))).toEqual(["Elige una fecha válida."]);
    expect(messages(detailsSchema.safeParse({ ...base, title: " " }))).toEqual(["Escribe un título para la decisión."]);
  });
});
