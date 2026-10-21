import { describe, expect, it, vi } from "vitest";
import { createFetcher } from "@/infrastructure/http/fetcher";
import { createEnergyClientAdapter } from "./client-adapter";

const NOW = new Date("2026-10-20T15:00:00.000Z");
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const adapter = (fetchImpl: typeof fetch) => createEnergyClientAdapter({ fetcher: createFetcher({ fetchImpl, retryDelayMs: 0 }) });
const okBody = {
  status: "ok",
  unit: "COP/kWh",
  days: [{ date: "2026-10-18", value: 300 }, { date: "2026-10-19", value: 330 }],
  provenance: { url: "https://servapibi.xm.com.co/hourly", license: "sin licencia abierta declarada", attribution: "XM S.A. E.S.P.", fetchedAt: NOW.toISOString() },
};

describe("createEnergyClientAdapter", () => {
  it("maps the route answer to observations with provenance and passes only `days`", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(json(okBody));
    const result = await adapter(fetchImpl).fetch({ days: 30 }, { now: NOW });
    expect(fetchImpl.mock.calls[0][0]).toBe("/api/energia?days=30");
    if (!result.ok) throw new Error("expected ok");
    expect(result.value.data).toHaveLength(2);
    expect(result.value.data[0]).toMatchObject({ indicatorId: "precio_bolsa_energia", unit: "COP/kWh", provenance: { sourceId: "xm" } });
  });

  it("maps a disabled source, a server error and a bad shape to typed errors", async () => {
    const disabled = await adapter(vi.fn().mockResolvedValue(json({ status: "disabled" }))).fetch({}, { now: NOW });
    expect(!disabled.ok && disabled.error.kind).toBe("disabled");
    const down = await adapter(vi.fn().mockResolvedValue(json({ status: "error", message: "XM limitó las consultas." }, 502))).fetch({}, { now: NOW });
    expect(!down.ok && down.error.message).toBe("XM limitó las consultas.");
    const bad = await adapter(vi.fn().mockResolvedValue(json({ nope: 1 }))).fetch({}, { now: NOW });
    expect(!bad.ok && bad.error.kind).toBe("schema");
  });
});
