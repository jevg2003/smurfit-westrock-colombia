import { describe, expect, it } from "vitest";
import type { Decision } from "../domain/decision";
import { briefingToCsv } from "./briefing-to-csv";
import { briefingToMarkdown } from "./briefing-to-markdown";
import { buildBriefing } from "./build-briefing";
import { buildPestel } from "./build-pestel";
import { clock, makeBriefingSignal } from "./test-data";

const signals = [
  makeBriefingSignal("a", "2026-10-13T15:00:00.000Z", {
    title: "Contrato vence",
    pestel: "political",
    severity: "alert",
    ruleId: "secop.expiring-contract.v1",
  }),
  makeBriefingSignal("b", "2026-10-14T15:00:00.000Z", {
    title: "Competidor firmó",
    pestel: "economic",
    ruleId: "secop.competitor-new-contract.v1",
  }),
  makeBriefingSignal("old", "2026-10-06T15:00:00.000Z", { pestel: "economic" }),
];

const DECISIONS: Decision[] = [
  {
    id: "d1",
    title: "¿Cubrimos la exposición?",
    question: "Pregunta *clave*",
    pestelFactors: ["economic"],
    linkedSignalIds: ["b"],
    options: [],
    status: "evaluating",
    rationale: "",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-02T00:00:00.000Z",
    reviewAt: "2026-11-01",
  },
  {
    id: "d2",
    title: "Ya resuelta",
    question: "",
    pestelFactors: ["legal"],
    linkedSignalIds: [],
    options: [],
    status: "decided",
    rationale: "ok",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-02T00:00:00.000Z",
  },
];

function setup() {
  const result = buildBriefing({ signals, alerts: [], clock });
  if (!result.ok) throw new Error("briefing failed");
  const briefing = result.value;
  const pestel = buildPestel(signals, { from: briefing.periodFrom, to: briefing.periodTo });
  return { briefing, extras: { pestel, decisions: DECISIONS } };
}

describe("briefingToMarkdown with a PESTEL reading", () => {
  const { briefing, extras } = setup();
  const md = briefingToMarkdown(briefing, extras);

  it("adds a Lectura PESTEL section with counts, impact, trend and sourced top signals", () => {
    expect(md).toContain("## Lectura PESTEL");
    expect(md).toContain("### Político");
    expect(md).toContain("1 alerta");
    expect(md).toContain("Amenaza: 1");
    expect(md).toContain("Comparación de conteos");
    expect(md).toContain("no es un pronóstico");
    expect(md).toContain("Enlace: https://example.test/record");
  });

  it("marks factors without signals instead of hiding them", () => {
    expect(md).toContain("### Legal");
    expect(md).toContain("Sin avisos en este período.");
  });

  it("lists only open and evaluating decisions", () => {
    expect(md).toContain("## Decisiones abiertas");
    expect(md).toContain("¿Cubrimos la exposición?");
    expect(md).toContain("Pregunta \\*clave\\*");
    expect(md).not.toContain("Ya resuelta");
  });

  it("is unchanged without extras", () => {
    expect(briefingToMarkdown(briefing)).not.toContain("Lectura PESTEL");
    expect(briefingToMarkdown(briefing)).not.toContain("Decisiones abiertas");
  });
});

describe("briefingToCsv with a PESTEL reading", () => {
  const { briefing, extras } = setup();
  const lines = briefingToCsv(briefing, extras).split("\n");

  it("keeps the header and adds one row per factor and per open decision", () => {
    expect(lines[0]).toBe(briefingToCsv(briefing).split("\n")[0]);
    expect(lines.filter((line) => line.startsWith("lectura PESTEL"))).toHaveLength(6);
    expect(lines.filter((line) => line.startsWith("decisión abierta"))).toHaveLength(1);
  });

  it("puts the factor label and the count comparison in the row", () => {
    const row = lines.find((line) => line.startsWith("lectura PESTEL") && line.includes("Político"));
    expect(row).toContain("Avisos: 1");
    expect(row).toContain("Comparación de conteos");
  });
});
