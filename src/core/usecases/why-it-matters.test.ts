import { describe, expect, it } from "vitest";
import { TEST_COMPANY } from "../company/test-fixtures";
import type { Signal } from "../domain/signal";
import { whyItMatters } from "./why-it-matters";

const signal = (overrides: Partial<Signal> = {}): Signal => ({
  id: "x:1:2026-10-20",
  ruleId: "news.keyword-mention.v1",
  ruleText: "regla",
  dimension: "market",
  pestel: "economic",
  severity: "info",
  kind: "event",
  title: "Titular sin relación",
  detail: "Diario, 2026-10-20.",
  occurredAt: "2026-10-20T10:00:00.000Z",
  evidence: [],
  provenance: [],
  ...overrides,
});

describe("whyItMatters", () => {
  it("names the competitor the aviso mentions", () => {
    expect(whyItMatters(signal({ title: "Competidora Uno gana contrato" }), TEST_COMPANY)).toBe("Menciona a su competidor «Competidora Uno».");
  });

  it("names the priority whose words appear", () => {
    expect(whyItMatters(signal({ title: "Sube el costo de energía industrial" }), TEST_COMPANY)).toBe("Afecta su prioridad: «Reducir costos de energía».");
  });

  it("names a watched term when nothing stronger matches", () => {
    expect(whyItMatters(signal({ title: "Nuevo arancel acero entra en vigor" }), TEST_COMPANY)).toBe("Coincide con un término que usted vigila: «arancel acero».");
  });

  it("prefers competitor over priority over term", () => {
    const text = "Competidora Dos y energía y arancel acero";
    expect(whyItMatters(signal({ title: text }), TEST_COMPANY)).toContain("competidor");
  });

  it("returns undefined when nothing matches, without inventing a consequence", () => {
    expect(whyItMatters(signal(), TEST_COMPANY)).toBeUndefined();
    expect(whyItMatters(signal(), undefined)).toBeUndefined();
  });

  it("does not match a priority on short filler words", () => {
    const profile = { ...TEST_COMPANY, goals: { ...TEST_COMPANY.goals, priorities: ["Crecer en el mercado"] } };
    expect(whyItMatters(signal({ title: "El nuevo mercado de arte" }), profile)).toBeUndefined();
  });
});
