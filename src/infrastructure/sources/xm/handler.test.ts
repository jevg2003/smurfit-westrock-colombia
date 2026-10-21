import { describe, expect, it, vi } from "vitest";
import recorded from "./fixtures/prec-bols-naci.json";
import { handleEnergyRequest, type EnergyResponse } from "./handler";

const NOW = new Date("2026-10-20T15:00:00.000Z");
const FLAGS = { newsRss: true, googleNews: true, minambiente: true, presidencia: true, xm: true };
const call = (query: string, deps: Parameters<typeof handleEnergyRequest>[1] = {}) =>
  handleEnergyRequest(new Request(`http://localhost/api/energia${query}`), { now: () => NOW, flags: () => FLAGS, ...deps });

const okFetch = () => vi.fn().mockImplementation(async () => new Response(JSON.stringify(recorded), { status: 200 }));

describe("handleEnergyRequest", () => {
  it("returns the daily series with provenance and a 6 hour shared cache", async () => {
    const response = await call("", { fetchImpl: okFetch() });
    const body = (await response.json()) as EnergyResponse;
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=21600");
    expect(body.status).toBe("ok");
    if (body.status !== "ok") return;
    expect(body.days.length).toBeGreaterThan(20);
    expect(body.unit).toBe("COP/kWh");
    expect(body.provenance.attribution).toContain("XM");
  });

  it.each(["?days=0", "?days=61", "?days=abc", "?days=1.5", "?metric=x", "?days=5&url=http://evil"])("rejects %s with 400", async (query) => {
    const fetchImpl = okFetch();
    const response = await call(query, { fetchImpl });
    expect(response.status).toBe(400);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reads 60 days in two XM queries (the API refuses wider windows)", async () => {
    const fetchImpl = okFetch();
    await call("?days=60", { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const windows = fetchImpl.mock.calls.map(([, init]) => JSON.parse((init as RequestInit).body as string));
    expect(windows[0].EndDate).toBe("2026-10-19");
    expect(windows[1].EndDate).toBe("2026-09-18");
  });

  it("answers disabled without calling XM when FEATURE_XM is off", async () => {
    const fetchImpl = okFetch();
    const response = await call("", { fetchImpl, flags: () => ({ ...FLAGS, xm: false }) });
    expect(await response.json()).toEqual({ status: "disabled" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("answers 502 with a message when XM is down", async () => {
    const response = await call("", { fetchImpl: vi.fn().mockResolvedValue(new Response("x", { status: 503 })) });
    const body = (await response.json()) as EnergyResponse;
    expect(response.status).toBe(502);
    expect(body.status).toBe("error");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
