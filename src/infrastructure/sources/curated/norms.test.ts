import { describe, expect, it } from "vitest";
import raw from "@/content/regulacion/normas.json";
import { loadCuratedNorms, parseCuratedNorms } from "./norms";

/** A norm as the curated file would hold it. The shipped file is empty: each deployment adds its own. */
const SAMPLE = {
  id: "ley-ejemplo",
  name: "Ley de ejemplo",
  date: "2024-01-01",
  topic: "Tema de ejemplo",
  whyItMatters: "Explica por qué importa a la empresa que la lee.",
  url: "https://www.example.test/ley",
  reviewedAt: "2026-10-20",
  curated: true,
};

describe("curated norms", () => {
  it("ships an empty list that loads without error", () => {
    expect(raw).toEqual([]);
    expect(loadCuratedNorms()).toEqual([]);
  });

  it("marks every parsed norm as curated and reviewed, with its provenance", () => {
    const result = parseCuratedNorms([SAMPLE]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.norms[0]).toMatchObject({ name: "Ley de ejemplo", curated: true });
    expect(result.norms[0].provenance).toMatchObject({ sourceId: "curated", curated: true, url: SAMPLE.url });
  });

  it("rejects a malformed file instead of showing partial data", () => {
    expect(parseCuratedNorms([{ id: "x" }]).ok).toBe(false);
    expect(parseCuratedNorms([{ ...SAMPLE, curated: false }]).ok).toBe(false);
    expect(parseCuratedNorms([{ ...SAMPLE, url: "javascript:alert(1)" }]).ok).toBe(false);
  });

  it("accepts a norm with no verified link (url null)", () => {
    expect(parseCuratedNorms([{ ...SAMPLE, url: null }]).ok).toBe(true);
  });
});
