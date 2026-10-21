import { describe, expect, it, vi } from "vitest";
import { createFetcher } from "@/infrastructure/http/fetcher";
import cpi from "./fixtures/cpi-inflation.col.json";
import gdp from "./fixtures/gdp-growth.col.json";
import { WORLD_BANK_BASE_URL, buildWorldBankUrl, createWorldBankAdapter } from "./adapter";

const NOW = new Date("2026-10-20T15:00:00.000Z");

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function adapterWith(fetchImpl: typeof fetch) {
  return createWorldBankAdapter({ fetcher: createFetcher({ fetchImpl, retryDelayMs: 0 }) });
}

describe("buildWorldBankUrl", () => {
  it("asks for the whole annual series of Colombia for one indicator", () => {
    expect(buildWorldBankUrl("pib")).toBe(`${WORLD_BANK_BASE_URL}/NY.GDP.MKTP.KD.ZG?format=json&per_page=200`);
    expect(buildWorldBankUrl("ipc_anual")).toContain("/FP.CPI.TOTL.ZG?");
  });
});

describe("createWorldBankAdapter", () => {
  it("maps the recorded GDP growth series to observations with provenance, oldest first", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(gdp));
    const result = await adapterWith(fetchImpl).fetch({ indicator: "pib" }, { now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.value.data;
    expect(data.at(-1)).toMatchObject({ indicatorId: "pib", date: "2025", unit: "%" });
    expect(data.at(-1)?.value).toBeCloseTo(2.642, 3);
    expect(data.map((obs) => obs.date)).toEqual([...data.map((obs) => obs.date)].sort());
    expect(data[0].provenance).toMatchObject({
      sourceId: "world-bank",
      license: "CC BY 4.0",
      attribution: "Banco Mundial – World Development Indicators",
      fetchedAt: NOW.toISOString(),
    });
    expect(result.value.provenance.url).toContain("NY.GDP.MKTP.KD.ZG");
  });

  it("drops years without a value instead of inventing one", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(gdp));
    const result = await adapterWith(fetchImpl).fetch({ indicator: "pib" }, { now: NOW });
    if (!result.ok) throw new Error("expected ok");
    const rows = gdp[1] as { value: number | null }[];
    const withNull = rows.filter((row) => row.value === null);
    expect(withNull.length).toBeGreaterThan(0);
    expect(result.value.data).toHaveLength(rows.length - withNull.length);
    expect(result.value.data.every((obs) => Number.isFinite(obs.value))).toBe(true);
  });

  it("maps the CPI series with its own indicator id", async () => {
    const result = await adapterWith(vi.fn().mockResolvedValue(jsonResponse(cpi))).fetch({ indicator: "ipc_anual" }, { now: NOW });
    expect(result.ok && result.value.data.at(-1)).toMatchObject({ indicatorId: "ipc_anual", date: "2025" });
  });

  it("returns empty when every year is null or the list is null", async () => {
    const meta = { page: 1, pages: 1, per_page: 200, total: 0, sourceid: "2", lastupdated: "2026-10-08" };
    const result = await adapterWith(vi.fn().mockResolvedValue(jsonResponse([meta, null]))).fetch({ indicator: "pib" }, { now: NOW });
    expect(result).toMatchObject({ ok: false, error: { sourceId: "world-bank", kind: "empty" } });
  });

  it("returns schema when the API answers 200 with an error message body", async () => {
    const body = [{ message: [{ id: "120", key: "Invalid value", value: "The provided parameter value is not valid" }] }];
    const result = await adapterWith(vi.fn().mockResolvedValue(jsonResponse(body))).fetch({ indicator: "pib" }, { now: NOW });
    expect(result).toMatchObject({ ok: false, error: { kind: "schema" } });
  });

  it("returns rate_limited on a 429 without retrying", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, 429));
    const result = await adapterWith(fetchImpl).fetch({ indicator: "pib" }, { now: NOW });
    expect(result).toMatchObject({ ok: false, error: { kind: "rate_limited", status: 429 } });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns network on a persistent 503 and when the request throws", async () => {
    const down = vi.fn().mockResolvedValue(jsonResponse({}, 503));
    expect(await adapterWith(down).fetch({ indicator: "pib" }, { now: NOW })).toMatchObject({
      ok: false,
      error: { kind: "network", status: 503 },
    });
    const thrown = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    expect(await adapterWith(thrown).fetch({ indicator: "pib" }, { now: NOW })).toMatchObject({ ok: false, error: { kind: "network" } });
  });

  it("returns schema when the body is not JSON", async () => {
    const result = await adapterWith(vi.fn().mockResolvedValue(new Response("<html>", { status: 200 }))).fetch({ indicator: "pib" }, { now: NOW });
    expect(result).toMatchObject({ ok: false, error: { kind: "schema" } });
  });

  it("rejects an unsupported indicator before calling the network", async () => {
    const fetchImpl = vi.fn();
    const result = await adapterWith(fetchImpl).fetch({ indicator: "trm" as never }, { now: NOW });
    expect(result).toMatchObject({ ok: false, error: { kind: "unknown" } });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
