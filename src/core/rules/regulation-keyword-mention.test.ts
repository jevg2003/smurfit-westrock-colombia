import { describe, expect, it } from "vitest";
import type { RegulationItem } from "../domain/regulation";
import { REGULATION_KEYWORD_MENTION_RULE_ID, detectRegulationMentions } from "./regulation-keyword-mention";
import { fixedClock } from "./test-fixtures";

const NOW = "2026-10-20T15:00:00.000Z";
const INCLUDE = ["residuos", "envases", "reciclaje", "aranceles"];
const EXCLUDE = ["nombramiento", "encargo"];

const makeItem = (id: string, title: string, publishedAt: string, over: Partial<RegulationItem> = {}): RegulationItem => ({
  id,
  kind: "minambiente",
  title,
  url: `https://example.test/${id}`,
  publishedAt,
  provenance: { sourceId: "minambiente", url: "https://www.minambiente.gov.co/feed/", fetchedAt: NOW, license: "n/a", attribution: "Minambiente" },
  ...over,
});

const run = (items: RegulationItem[]) => detectRegulationMentions({ items, include: INCLUDE, exclude: EXCLUDE, clock: fixedClock(NOW) });

describe("regulation.keyword-mention.v1", () => {
  it("signals a recent publication that mentions a keyword, as info in the regulation dimension", () => {
    const [signal] = run([makeItem("a", "Nueva meta de reciclaje de envases", "2026-10-15T12:00:00.000Z")]);
    expect(signal).toMatchObject({
      ruleId: REGULATION_KEYWORD_MENTION_RULE_ID,
      dimension: "regulation",
      severity: "info",
      pestel: "legal",
      evidence: [{ kind: "regulation", ref: "a" }],
    });
    expect(signal.ruleText).toContain("30 días");
    expect(signal.ruleText).toContain("envases");
    expect(signal.detail).toContain("Minambiente");
  });

  it("also reads the summary of decrees", () => {
    const decree = makeItem("d", "DECRETO No. 970 DEL 4 DE AGOSTO", "2026-10-10T12:00:00.000Z", {
      kind: "decree",
      summary: "Por el cual se reglamentan los residuos de envases",
      provenance: { sourceId: "presidencia", url: "https://www.datos.gov.co/resource/88h2-dykw.json", fetchedAt: NOW, license: "CC BY-SA 4.0", attribution: "DAPRE" },
    });
    const [signal] = run([decree]);
    expect(signal.detail).toContain("Decreto");
  });

  it("ignores items without keywords, with excluded terms, or outside the window", () => {
    expect(run([makeItem("a", "Colombia y Armenia lanzan una coalición", "2026-10-15T12:00:00.000Z")])).toEqual([]);
    expect(run([makeItem("b", "Encargo de funciones sobre residuos", "2026-10-15T12:00:00.000Z")])).toEqual([]);
    expect(run([makeItem("c", "Residuos hoy", "2026-09-19T14:59:00.000Z")])).toEqual([]);
    expect(run([makeItem("d", "Residuos mañana", "2026-10-21T15:00:00.000Z")])).toEqual([]);
  });

  it("includes exactly 30 days ago", () => {
    expect(run([makeItem("e", "Residuos", "2026-09-20T15:00:00.000Z")])).toHaveLength(1);
  });

  it("respects word boundaries and accents", () => {
    expect(run([makeItem("f", "Reciclajes y más", "2026-10-15T12:00:00.000Z")])).toEqual([]);
    expect(run([makeItem("g", "RECICLAJE URBANO", "2026-10-15T12:00:00.000Z")])).toHaveLength(1);
  });
});
