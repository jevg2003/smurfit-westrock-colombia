import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_REGULATION_EXCLUDE_KEYWORDS, DEFAULT_REGULATION_KEYWORDS } from "@/core/company/defaults";
import { buildDecreesUrl, parseDecrees } from "./decrees";

const fixture: unknown = JSON.parse(readFileSync(new URL("./fixtures/decretos.sample.json", import.meta.url), "utf8"));
const TERMS = { include: DEFAULT_REGULATION_KEYWORDS, exclude: DEFAULT_REGULATION_EXCLUDE_KEYWORDS };

describe("buildDecreesUrl", () => {
  const url = decodeURIComponent(buildDecreesUrl(new Date("2026-10-20T15:00:00.000Z")));

  it("uses exact filters and a bounded limit, never LIKE", () => {
    expect(url.startsWith("https://www.datos.gov.co/resource/88h2-dykw.json?")).toBe(true);
    expect(url).toContain("tipo='DECRETOS'");
    expect(url).toContain("fecha>'2025-10-20T00:00:00.000'");
    expect(url).toContain("$order=fecha DESC");
    expect(url).toMatch(/\$limit=\d+/);
    expect(url.toLowerCase()).not.toContain("like");
  });
});

describe("parseDecrees (real recorded rows)", () => {
  const result = parseDecrees(fixture, TERMS, 60);

  it("keeps only decrees that mention a regulation keyword and drops appointments", () => {
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.length).toBeLessThan(60);
    expect(result.items.every((item) => item.kind === "decree")).toBe(true);
    expect(result.items.some((item) => /nombr/i.test(item.title + (item.summary ?? "")))).toBe(false);
  });

  it("maps title, plain-text summary, http(s) link and a Bogota-anchored ISO date", () => {
    if (!result.ok) throw new Error("expected ok");
    const [first] = result.items;
    expect(first.title).toMatch(/^DECRETO No\./);
    expect(first.url).toMatch(/^https:\/\/dapre\.presidencia\.gov\.co\//);
    expect(first.publishedAt).toMatch(/Z$/);
    expect(first.summary).not.toMatch(/^"/);
  });

  it("gives stable unique ids and sorts newest first", () => {
    if (!result.ok) throw new Error("expected ok");
    const ids = result.items.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    const times = result.items.map((item) => Date.parse(item.publishedAt));
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it("honors the limit and drops rows with unsafe links", () => {
    const rows = [
      { titulo: "DECRETO 1", descripcion: "residuos", tipo: "DECRETOS", fecha: "2026-08-01T10:00:00.000", url: "javascript:alert(1)" },
      { titulo: "DECRETO 2", descripcion: "residuos", tipo: "DECRETOS", fecha: "2026-08-02T10:00:00.000", url: "https://dapre.presidencia.gov.co/a.pdf" },
      { titulo: "DECRETO 3", descripcion: "residuos", tipo: "DECRETOS", fecha: "2026-08-03T10:00:00.000", url: "https://dapre.presidencia.gov.co/b.pdf" },
    ];
    const limited = parseDecrees(rows, TERMS, 1);
    expect(limited.ok && limited.items.map((i) => i.title)).toEqual(["DECRETO 3"]);
  });

  it("fails with a schema error when the dataset changes shape", () => {
    expect(parseDecrees({ nope: 1 }, TERMS, 10)).toMatchObject({ ok: false });
    expect(parseDecrees([{ titulo: 5 }], TERMS, 10)).toMatchObject({ ok: false });
  });
});
