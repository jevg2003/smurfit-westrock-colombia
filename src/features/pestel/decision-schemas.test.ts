import { describe, expect, it } from "vitest";
import { fieldMeta } from "@/lib/schema-meta";
import { createDecisionSchema, detailsSchema, statusSchema, statusSchemaFor } from "./decision-schemas";

const messages = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map((issue) => issue.message) ?? [];

describe("createDecisionSchema", () => {
  it("asks for a title", () => {
    const result = createDecisionSchema.safeParse({ title: "   ", question: "", factors: [] });
    expect(result.success).toBe(false);
    expect(messages(result)).toEqual(["Escriba un título para la decisión."]);
  });

  it("accepts a title with an empty question", () => {
    expect(createDecisionSchema.safeParse({ title: "Cubrir el dólar", question: "", factors: [] }).success).toBe(true);
  });
});

describe("statusSchema", () => {
  it.each(["decided", "discarded"] as const)("requires a rationale to mark %s", (status) => {
    const result = statusSchema.safeParse({ status, rationale: "  ", chosen: undefined });
    expect(result.success).toBe(false);
    expect(messages(result)).toEqual(["Escriba el motivo para marcar la decisión como decidida o descartada."]);
  });

  it("does not need a rationale for open or evaluating", () => {
    expect(statusSchema.safeParse({ status: "evaluating", rationale: "", chosen: undefined }).success).toBe(true);
    expect(statusSchema.safeParse({ status: "decided", rationale: "Lo exige la norma", chosen: undefined }).success).toBe(true);
  });
});

describe("limits and required marks come from the schemas", () => {
  it("limits the title and the question of a new decision", () => {
    expect(fieldMeta(createDecisionSchema, "title")).toMatchObject({ required: true, maxLength: 120 });
    expect(fieldMeta(createDecisionSchema, "question")).toMatchObject({ required: false, maxLength: 500 });
  });

  it("limits the edit form fields, including each option", () => {
    expect(fieldMeta(detailsSchema, "owner")).toMatchObject({ required: false, maxLength: 80 });
    expect(fieldMeta(detailsSchema, "options[0].label")).toMatchObject({ required: true, maxLength: 80 });
    expect(fieldMeta(detailsSchema, "options[1].pros")).toMatchObject({ required: false, maxLength: 300 });
    expect(fieldMeta(detailsSchema, "options[1].cons")).toMatchObject({ required: false, maxLength: 300 });
    expect(fieldMeta(detailsSchema, "reviewAt").required).toBe(false);
  });

  it("makes the rationale required only for decided and discarded", () => {
    expect(fieldMeta(statusSchemaFor("decided"), "rationale")).toMatchObject({ required: true, maxLength: 1000 });
    expect(fieldMeta(statusSchemaFor("discarded"), "rationale").required).toBe(true);
    expect(fieldMeta(statusSchemaFor("evaluating"), "rationale")).toMatchObject({ required: false, maxLength: 1000 });
  });

  it("rejects text over the limits", () => {
    expect(createDecisionSchema.safeParse({ title: "x".repeat(121), question: "", factors: [] }).success).toBe(false);
    expect(statusSchema.safeParse({ status: "decided", rationale: "x".repeat(1001) }).success).toBe(false);
  });
});

describe("detailsSchema", () => {
  const base = { title: "T", question: "", factors: [], options: [], linked: [], owner: "", reviewAt: "" };

  it("accepts an empty optional date and a valid day key", () => {
    expect(detailsSchema.safeParse(base).success).toBe(true);
    expect(detailsSchema.safeParse({ ...base, reviewAt: "2026-11-05" }).success).toBe(true);
  });

  it("rejects a broken date and an empty title", () => {
    expect(messages(detailsSchema.safeParse({ ...base, reviewAt: "05/11/2026" }))).toEqual(["Elija una fecha válida."]);
    expect(messages(detailsSchema.safeParse({ ...base, title: " " }))).toEqual(["Escriba un título para la decisión."]);
  });
});
