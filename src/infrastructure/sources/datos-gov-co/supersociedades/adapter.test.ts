import { describe, expect, it, vi } from "vitest";
import { watchedNits } from "@/core/company/profile";
import { TEST_COMPANY } from "@/core/company/test-fixtures";
import { createFetcher } from "@/infrastructure/http/fetcher";
import sample from "./fixtures/supersociedades.sample.json";
import { SUPERSOCIEDADES_DATASET_URL, buildSupersociedadesUrl, createSupersociedadesAdapter, parseAmount } from "./adapter";

const NITS = watchedNits(TEST_COMPANY);
const NOW = new Date("2026-10-20T15:00:00.000Z");

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function adapterWith(fetchImpl: typeof fetch) {
  return createSupersociedadesAdapter({ fetcher: createFetcher({ fetchImpl, retryDelayMs: 0 }) });
}

describe("parseAmount", () => {
  it.each([
    ["$ 1.91", 1.91],
    ["$0.57", 0.57],
    ["$ 0.00", 0],
    ["$ -0.02", -0.02],
    ["-$ 0.02", -0.02],
    ["  $ 12  ", 12],
  ])("reads %j as %d", (text, expected) => {
    expect(parseAmount(text)).toBe(expected);
  });

  it.each(["", "$", "n/d", "$ 1,91", "1.9.1", "$ 1e3", "NaN", "$ Infinity"])("rejects %j", (text) => {
    expect(parseAmount(text)).toBeNull();
  });
});

describe("buildSupersociedadesUrl", () => {
  it("filters by NIT with IN, orders by cutoff year and never uses LIKE", () => {
    const url = decodeURIComponent(buildSupersociedadesUrl(NITS));
    expect(url.startsWith(`${SUPERSOCIEDADES_DATASET_URL}?`)).toBe(true);
    expect(url).toContain("$where=nit in(900000001,900000002,900000003,900000004)");
    expect(url).toContain("$order=a_o_de_corte DESC");
    expect(url.toLowerCase()).not.toContain("like");
  });
});

describe("createSupersociedadesAdapter", () => {
  it("maps the recorded response to company financials with a unit note and provenance", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(sample));
    const result = await adapterWith(fetchImpl).fetch({ nits: NITS }, { now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.data).toHaveLength(sample.length);
    const own = result.value.data.find((row) => row.nit === "900000001" && row.cutoffYear === 2025);
    expect(own).toMatchObject({
      name: "EMPRESA EJEMPLO S.A.",
      city: "ITAGÜÍ",
      ciiu: "1701",
      revenue: 1.91,
      netIncome: 0.18,
      totalAssets: 4.49,
    });
    expect(own?.unitNote).toContain("unidad no declarada por la fuente");
    expect(own?.provenance).toMatchObject({
      sourceId: "supersociedades",
      license: "CC BY-SA 4.0",
      attribution: "Superintendencia de Sociedades vía datos.gov.co",
      fetchedAt: NOW.toISOString(),
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("normalizes the number-typed NIT, CIIU and year the source returns as decimals", async () => {
    const result = await adapterWith(vi.fn().mockResolvedValue(jsonResponse(sample))).fetch({ nits: NITS }, { now: NOW });
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.data.every((row) => /^\d{9}$/.test(row.nit))).toBe(true);
    expect(result.value.data.every((row) => Number.isInteger(row.cutoffYear))).toBe(true);
    expect(result.value.data.every((row) => !row.ciiu?.includes("."))).toBe(true);
  });

  it("skips a row whose amount cannot be read instead of inventing a number", async () => {
    const rows = [sample[0], { ...sample[1], ingresos_operacionales: "n/d" }];
    const result = await adapterWith(vi.fn().mockResolvedValue(jsonResponse(rows))).fetch({ nits: NITS }, { now: NOW });
    expect(result.ok && result.value.data).toHaveLength(1);
  });

  it("returns empty for an empty list", async () => {
    const result = await adapterWith(vi.fn().mockResolvedValue(jsonResponse([]))).fetch({ nits: NITS }, { now: NOW });
    expect(result).toMatchObject({ ok: false, error: { sourceId: "supersociedades", kind: "empty" } });
  });

  it("returns schema when the payload has the wrong shape or is not JSON", async () => {
    expect(await adapterWith(vi.fn().mockResolvedValue(jsonResponse([{ nit: "1" }]))).fetch({ nits: NITS }, { now: NOW })).toMatchObject({
      ok: false,
      error: { kind: "schema" },
    });
    expect(await adapterWith(vi.fn().mockResolvedValue(new Response("<html>"))).fetch({ nits: NITS }, { now: NOW })).toMatchObject({
      ok: false,
      error: { kind: "schema" },
    });
  });

  it("returns rate_limited on a 429 without retrying", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, 429));
    expect(await adapterWith(fetchImpl).fetch({ nits: NITS }, { now: NOW })).toMatchObject({
      ok: false,
      error: { kind: "rate_limited", status: 429 },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns network on a persistent 503 and when the request throws", async () => {
    const down = vi.fn().mockResolvedValue(jsonResponse({}, 503));
    expect(await adapterWith(down).fetch({ nits: NITS }, { now: NOW })).toMatchObject({ ok: false, error: { kind: "network", status: 503 } });
    const thrown = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    expect(await adapterWith(thrown).fetch({ nits: NITS }, { now: NOW })).toMatchObject({ ok: false, error: { kind: "network" } });
  });

  it("rejects malformed NITs before calling the network", async () => {
    const fetchImpl = vi.fn();
    const result = await adapterWith(fetchImpl).fetch({ nits: ["1' OR 1=1"] }, { now: NOW });
    expect(result).toMatchObject({ ok: false, error: { kind: "unknown" } });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
