import { describe, expect, it, vi } from "vitest";
import { createFetcher } from "@/infrastructure/http/fetcher";
import sample from "./fixtures/exportaciones.sample.json";
import { EXPORTS_DATASET_URL, buildExportsUrl, createExportsAdapter } from "./adapter";

const NOW = new Date("2026-10-20T15:00:00.000Z");

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function adapterWith(fetchImpl: typeof fetch) {
  return createExportsAdapter({ fetcher: createFetcher({ fetchImpl, retryDelayMs: 0 }) });
}

describe("buildExportsUrl", () => {
  it("selects only the columns it reads, from ten years back, without LIKE", () => {
    const url = decodeURIComponent(buildExportsUrl(NOW));
    expect(url.startsWith(`${EXPORTS_DATASET_URL}?`)).toBe(true);
    expect(url).toContain("$select=fecha,fecha_de_corte,valor_exportaciones_nme");
    expect(url).toContain("$where=fecha>'2016-01-01T00:00:00.000'");
    expect(url).toContain("$order=fecha DESC");
    expect(url.toLowerCase()).not.toContain("like");
  });
});

describe("createExportsAdapter", () => {
  it("maps the recorded response to quarterly observations, oldest first, with provenance", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(sample));
    const result = await adapterWith(fetchImpl).fetch({}, { now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const data = result.value.data;
    expect(data).toHaveLength(sample.length);
    expect(data.at(-1)).toMatchObject({ indicatorId: "exportaciones", date: "2026-06-30", value: 6234 });
    expect(data[0].date < data[1].date).toBe(true);
    expect(data[0].unit).toContain("millones de USD");
    expect(data[0].unit).toContain("unidad no declarada");
    expect(data[0].provenance).toMatchObject({
      sourceId: "exports",
      license: "CC BY-SA 4.0",
      attribution: "Ministerio de Comercio, Industria y Turismo - MinCIT vía datos.gov.co",
      fetchedAt: NOW.toISOString(),
    });
  });

  it("drops rows whose value is not a finite number", async () => {
    const rows = [sample[0], { ...sample[1], valor_exportaciones_nme: "n/d" }];
    const result = await adapterWith(vi.fn().mockResolvedValue(jsonResponse(rows))).fetch({}, { now: NOW });
    expect(result.ok && result.value.data).toHaveLength(1);
  });

  it("returns empty for an empty list", async () => {
    const result = await adapterWith(vi.fn().mockResolvedValue(jsonResponse([]))).fetch({}, { now: NOW });
    expect(result).toMatchObject({ ok: false, error: { sourceId: "exports", kind: "empty" } });
  });

  it("returns schema when the payload has the wrong shape or is not JSON", async () => {
    expect(await adapterWith(vi.fn().mockResolvedValue(jsonResponse([{ fecha: "x" }]))).fetch({}, { now: NOW })).toMatchObject({
      ok: false,
      error: { kind: "schema" },
    });
    expect(await adapterWith(vi.fn().mockResolvedValue(new Response("<html>"))).fetch({}, { now: NOW })).toMatchObject({
      ok: false,
      error: { kind: "schema" },
    });
  });

  it("returns rate_limited on a 429 without retrying", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, 429));
    expect(await adapterWith(fetchImpl).fetch({}, { now: NOW })).toMatchObject({ ok: false, error: { kind: "rate_limited", status: 429 } });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns network on a persistent 503 and when the request throws", async () => {
    const down = vi.fn().mockResolvedValue(jsonResponse({}, 503));
    expect(await adapterWith(down).fetch({}, { now: NOW })).toMatchObject({ ok: false, error: { kind: "network", status: 503 } });
    const thrown = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    expect(await adapterWith(thrown).fetch({}, { now: NOW })).toMatchObject({ ok: false, error: { kind: "network" } });
  });
});
