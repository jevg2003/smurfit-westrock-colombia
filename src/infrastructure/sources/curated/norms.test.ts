import { describe, expect, it } from "vitest";
import raw from "@/content/regulacion/normas.json";
import { loadCuratedNorms, parseCuratedNorms } from "./norms";

describe("curated norms", () => {
  const norms = loadCuratedNorms();

  it("has the four base norms, all curated and reviewed today", () => {
    expect(norms.map((norm) => norm.name)).toEqual([
      "Resolución 1407 de 2018",
      "Resolución 803 de 2024",
      "Ley 2232 de 2022",
      "Ley 1581 de 2012",
    ]);
    for (const norm of norms) {
      expect(norm.curated).toBe(true);
      expect(norm.reviewedAt).toBe("2026-10-20");
      expect(norm.provenance).toMatchObject({ sourceId: "curated", curated: true });
      expect(norm.whyItMatters.length).toBeGreaterThan(20);
    }
  });

  it("only links to http(s) official pages or has no link", () => {
    for (const norm of norms) expect(norm.url === null || /^https:\/\//.test(norm.url)).toBe(true);
  });

  it("rejects a malformed file instead of showing partial data", () => {
    expect(parseCuratedNorms(raw).ok).toBe(true);
    expect(parseCuratedNorms([{ id: "x" }]).ok).toBe(false);
    expect(parseCuratedNorms([{ ...raw[0], curated: false }]).ok).toBe(false);
    expect(parseCuratedNorms([{ ...raw[0], url: "javascript:alert(1)" }]).ok).toBe(false);
  });

  it("accepts a norm with no verified link (url null)", () => {
    expect(parseCuratedNorms([{ ...raw[0], url: null }]).ok).toBe(true);
  });
});
