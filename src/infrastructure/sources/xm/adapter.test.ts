import { describe, expect, it, vi } from "vitest";
import { createFetcher } from "@/infrastructure/http/fetcher";
import recorded from "./fixtures/prec-bols-naci.json";
import { XM_HOURLY_URL, buildXmBody, createXmAdapter } from "./adapter";

const NOW = new Date("2026-10-20T15:00:00.000Z");

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function adapterWith(fetchImpl: typeof fetch) {
  return createXmAdapter({ fetcher: createFetcher({ fetchImpl, retryDelayMs: 0 }) });
}

describe("buildXmBody", () => {
  it("asks for the national spot price over a window that ends yesterday (UTC) and spans `days` days", () => {
    expect(buildXmBody(NOW, 31)).toEqual({
      MetricId: "PrecBolsNaci",
      Entity: "Sistema",
      StartDate: "2026-09-19",
      EndDate: "2026-10-19",
    });
  });

  it("never asks for more than the 31 days the API allows", () => {
    const body = buildXmBody(NOW, 90);
    expect(body.StartDate).toBe("2026-09-19");
  });
});

describe("createXmAdapter", () => {
  it("POSTs the metric query and maps the recorded series to daily means with provenance, oldest first", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(recorded));
    const result = await adapterWith(fetchImpl).fetch({}, { now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(XM_HOURLY_URL);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toMatchObject({ MetricId: "PrecBolsNaci", Entity: "Sistema" });

    const data = result.value.data;
    expect(data.length).toBeGreaterThan(20);
    expect(data.every((obs) => obs.indicatorId === "precio_bolsa_energia" && obs.unit === "COP/kWh")).toBe(true);
    expect(data.map((obs) => obs.date)).toEqual([...data.map((obs) => obs.date)].sort());
    expect(data[0].provenance).toMatchObject({ sourceId: "xm", url: XM_HOURLY_URL, fetchedAt: NOW.toISOString() });
    expect(data[0].provenance.attribution).toContain("XM");
  });

  it("computes each day as the arithmetic mean of its 24 hourly prices", async () => {
    const result = await adapterWith(vi.fn().mockResolvedValue(jsonResponse(recorded))).fetch({}, { now: NOW });
    if (!result.ok) throw new Error("expected ok");
    const day = recorded.Items[0];
    const values = day.HourlyEntities[0].Values as Record<string, string>;
    const hours = Object.entries(values).filter(([key]) => key.startsWith("Hour")).map(([, v]) => Number(v));
    expect(hours).toHaveLength(24);
    const mean = hours.reduce((a, b) => a + b, 0) / 24;
    expect(result.value.data[0].date).toBe(day.Date);
    expect(result.value.data[0].value).toBeCloseTo(mean, 6);
  });

  it("skips partial days instead of averaging a biased sample", async () => {
    const partial = structuredClone(recorded) as typeof recorded;
    delete (partial.Items[0].HourlyEntities[0].Values as Record<string, string>).Hour24;
    const result = await adapterWith(vi.fn().mockResolvedValue(jsonResponse(partial))).fetch({}, { now: NOW });
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.data.some((obs) => obs.date === recorded.Items[0].Date)).toBe(false);
    expect(result.value.data).toHaveLength(recorded.Items.length - 1);
  });

  it("returns empty when no day is complete", async () => {
    const body = { Metric: recorded.Metric, Items: [] };
    const result = await adapterWith(vi.fn().mockResolvedValue(jsonResponse(body))).fetch({}, { now: NOW });
    expect(result).toMatchObject({ ok: false, error: { sourceId: "xm", kind: "empty" } });
  });

  it("returns schema when the body changes shape", async () => {
    const result = await adapterWith(vi.fn().mockResolvedValue(jsonResponse({ Items: "nope" }))).fetch({}, { now: NOW });
    expect(result).toMatchObject({ ok: false, error: { kind: "schema" } });
  });

  it("returns schema when the body is not JSON (the API answers 400 text for unknown metrics)", async () => {
    const result = await adapterWith(vi.fn().mockResolvedValue(new Response("<html>", { status: 200 }))).fetch({}, { now: NOW });
    expect(result).toMatchObject({ ok: false, error: { kind: "schema" } });
  });

  it("returns rate_limited on 429 without retrying and network on 503 or a thrown request", async () => {
    const limited = vi.fn().mockResolvedValue(jsonResponse({}, 429));
    expect(await adapterWith(limited).fetch({}, { now: NOW })).toMatchObject({ ok: false, error: { kind: "rate_limited", status: 429 } });
    expect(limited).toHaveBeenCalledTimes(1);
    const down = vi.fn().mockResolvedValue(jsonResponse({}, 503));
    expect(await adapterWith(down).fetch({}, { now: NOW })).toMatchObject({ ok: false, error: { kind: "network", status: 503 } });
    const thrown = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    expect(await adapterWith(thrown).fetch({}, { now: NOW })).toMatchObject({ ok: false, error: { kind: "network" } });
  });
});
