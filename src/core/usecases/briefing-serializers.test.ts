import { describe, expect, it } from "vitest";
import { briefingToCsv } from "./briefing-to-csv";
import { briefingToMarkdown } from "./briefing-to-markdown";
import { buildBriefing } from "./build-briefing";
import { clock, makeAlert, makeBriefingSignal } from "./test-data";

function sampleBriefing() {
  const signals = [
    makeBriefingSignal("a", "2026-10-13T15:00:00.000Z", { title: "Contrato, con \"comillas\"" }),
    makeBriefingSignal("b", "2026-10-14T15:00:00.000Z", { dimension: "macro", severity: "alert", title: "=SUM(A1)" }),
  ];
  const result = buildBriefing({
    signals,
    alerts: [makeAlert(signals[1], { state: "dismissed", note: "No aplica", updatedAt: "2026-10-15T15:00:00.000Z" })],
    clock,
  });
  if (!result.ok) throw new Error("briefing failed");
  return result.value;
}

describe("briefingToMarkdown", () => {
  const markdown = briefingToMarkdown(sampleBriefing());

  it("starts with the period and carries the rules-only note", () => {
    expect(markdown).toContain("# Briefing del entorno");
    expect(markdown).toContain("2026-10-12 al 2026-10-18");
    expect(markdown).toContain("generado por reglas, sin IA");
  });

  it("groups signals by dimension with source, license, date and link", () => {
    expect(markdown).toContain("## Contratación");
    expect(markdown).toContain("## Macroeconomía");
    expect(markdown).toContain("Fuente de prueba");
    expect(markdown).toContain("CC BY-SA 4.0");
    expect(markdown).toContain("https://example.test/record");
    expect(markdown).toContain("2026-10-14");
    expect(markdown).toContain("Regla: regla de prueba");
  });

  it("lists avisos with state and note", () => {
    expect(markdown).toContain("## Estado de los avisos");
    expect(markdown).toContain("Descartado");
    expect(markdown).toContain("No aplica");
  });

  it("says so when the period has no signals", () => {
    const empty = buildBriefing({ signals: [], alerts: [], clock });
    if (!empty.ok) throw new Error("briefing failed");
    expect(briefingToMarkdown(empty.value)).toContain("Sin avisos en este período.");
  });
});

describe("briefingToCsv", () => {
  const csv = briefingToCsv(sampleBriefing());
  const lines = csv.split("\n");

  it("has a Spanish header and one row per signal and per alert", () => {
    expect(lines[0]).toBe("tipo,dimension,severidad,estado,fecha,titulo,detalle,regla,fuente,licencia,enlace,nota");
    expect(lines).toHaveLength(1 + 2 + 1);
  });

  it("escapes commas and quotes", () => {
    expect(csv).toContain('"Contrato, con ""comillas"""');
  });

  it("neutralizes spreadsheet formulas", () => {
    expect(csv).toContain("'=SUM(A1)");
    expect(csv).not.toMatch(/(^|,)=SUM/m);
  });

  it("includes the aviso state and note", () => {
    expect(lines.find((line) => line.startsWith("estado de aviso"))).toContain("descartado");
    expect(csv).toContain("No aplica");
  });
});
