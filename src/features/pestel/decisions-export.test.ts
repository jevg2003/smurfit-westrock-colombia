import { describe, expect, it } from "vitest";
import type { Decision } from "@/core/domain/decision";
import { decisionsToCsv, decisionsToMarkdown } from "./decisions-export";

const DECISION: Decision = {
  id: "d1",
  title: "¿Cubrimos?",
  question: "Pregunta",
  pestelFactors: ["economic", "legal"],
  linkedSignalIds: ["s1", "s2"],
  options: [
    { id: "o1", label: "Cubrir", pros: "Certeza", cons: "Costo" },
    { id: "o2", label: "No cubrir", pros: "", cons: "Riesgo" },
  ],
  status: "decided",
  chosenOption: "o1",
  rationale: "=Hay deuda",
  owner: "Finanzas",
  createdAt: "2026-10-01T15:00:00.000Z",
  updatedAt: "2026-10-02T15:00:00.000Z",
  reviewAt: "2026-12-01",
};

describe("decisionsToCsv", () => {
  it("writes one row per decision with labels, chosen option and linked signals", () => {
    const lines = decisionsToCsv([DECISION]).trim().split("\n");
    expect(lines[0]).toContain("titulo");
    expect(lines[1]).toContain("Económico; Legal");
    expect(lines[1]).toContain("Decidida");
    expect(lines[1]).toContain("Cubrir");
    expect(lines[1]).toContain("s1; s2");
  });

  it("neutralizes spreadsheet formulas", () => {
    expect(decisionsToCsv([DECISION])).toContain("'=Hay deuda");
  });
});

describe("decisionsToMarkdown", () => {
  const md = decisionsToMarkdown([DECISION]);
  it("lists options with pros and cons and the rationale", () => {
    expect(md).toContain("# Decisiones");
    expect(md).toContain("## ¿Cubrimos?");
    expect(md).toContain("Cubrir (elegida)");
    expect(md).toContain("A favor: Certeza");
    expect(md).toContain("En contra: Riesgo");
    expect(md).toContain("Motivo:");
  });

  it("escapes markdown control characters in user text", () => {
    expect(decisionsToMarkdown([{ ...DECISION, title: "Usar *negrita* y [enlace]" }])).toContain(
      "## Usar \\*negrita\\* y \\[enlace\\]",
    );
  });

  it("says so when there are no decisions", () => {
    expect(decisionsToMarkdown([])).toContain("Sin decisiones");
  });
});
