import { describe, expect, it } from "vitest";
import { type Decision, changeDecisionStatus, normalizeOptions } from "../domain/decision";

const NOW = "2026-10-20T15:00:00.000Z";

const base = (overrides: Partial<Decision> = {}): Decision => ({
  id: "d1",
  title: "¿Cubrimos la exposición cambiaria?",
  question: "¿Cubrimos?",
  pestelFactors: ["economic"],
  linkedSignalIds: [],
  options: [
    { id: "o1", label: "Cubrir", pros: "Certeza", cons: "Costo" },
    { id: "o2", label: "No cubrir", pros: "", cons: "Riesgo" },
  ],
  status: "open",
  rationale: "",
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
  ...overrides,
});

describe("changeDecisionStatus", () => {
  it("moves open to evaluating without a rationale", () => {
    const result = changeDecisionStatus(base(), "evaluating", {}, NOW);
    expect(result).toMatchObject({ ok: true, value: { status: "evaluating", updatedAt: NOW } });
  });

  it.each(["decided", "discarded"] as const)("requires a rationale to mark %s", (status) => {
    const empty = changeDecisionStatus(base(), status, { rationale: "   " }, NOW);
    expect(empty).toMatchObject({ ok: false, error: { kind: "rationale_required" } });
    const missing = changeDecisionStatus(base(), status, {}, NOW);
    expect(missing.ok).toBe(false);
  });

  it("stores the trimmed rationale and the chosen option when deciding", () => {
    const result = changeDecisionStatus(base(), "decided", { rationale: "  Hay deuda en USD  ", chosenOption: "o1" }, NOW);
    expect(result).toMatchObject({ ok: true, value: { status: "decided", rationale: "Hay deuda en USD", chosenOption: "o1" } });
  });

  it("rejects a chosen option that is not one of the options", () => {
    const result = changeDecisionStatus(base(), "decided", { rationale: "x", chosenOption: "zzz" }, NOW);
    expect(result).toMatchObject({ ok: false, error: { kind: "unknown_option" } });
  });

  it("allows reopening a closed decision to evaluating or open", () => {
    const decided = base({ status: "decided", rationale: "x" });
    expect(changeDecisionStatus(decided, "evaluating", {}, NOW).ok).toBe(true);
    const discarded = base({ status: "discarded", rationale: "x" });
    expect(changeDecisionStatus(discarded, "open", {}, NOW).ok).toBe(true);
  });

  it("rejects decided to discarded directly and a no-op change", () => {
    const decided = base({ status: "decided", rationale: "x" });
    expect(changeDecisionStatus(decided, "discarded", { rationale: "y" }, NOW)).toMatchObject({
      ok: false,
      error: { kind: "invalid_transition" },
    });
    expect(changeDecisionStatus(base(), "open", {}, NOW)).toMatchObject({ ok: false, error: { kind: "invalid_transition" } });
  });
});

describe("normalizeOptions", () => {
  it("drops options without a label and trims text", () => {
    const result = normalizeOptions([
      { id: "a", label: "  Sí ", pros: " p ", cons: " c " },
      { id: "b", label: "   ", pros: "x", cons: "y" },
    ]);
    expect(result).toEqual([{ id: "a", label: "Sí", pros: "p", cons: "c" }]);
  });
});
