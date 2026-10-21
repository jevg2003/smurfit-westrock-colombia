import { describe, expect, it, vi } from "vitest";
import { createFetcher } from "@/infrastructure/http/fetcher";
import { createRegulationAdapter } from "./client-adapter";

const NOW = new Date("2026-10-20T15:00:00.000Z");
const body = {
  minambiente: {
    status: "ok",
    items: [{ id: "minambiente:aaaaaaaa", kind: "minambiente", title: "Comunicado", url: "https://www.minambiente.gov.co/x/", publishedAt: "2026-10-16T14:46:16.000Z" }],
  },
  presidencia: {
    status: "ok",
    items: [
      { id: "decree:bbbbbbbb", kind: "decree", title: "DECRETO No. 970", summary: "Residuos", url: "https://dapre.presidencia.gov.co/a.pdf", publishedAt: "2026-08-04T15:00:00.000Z" },
      { id: "decree:cccccccc", kind: "decree", title: "DECRETO No. 971", url: "javascript:alert(1)", publishedAt: "2026-08-03T15:00:00.000Z" },
    ],
  },
  fetchedAt: "2026-10-20T14:59:00.000Z",
};

const adapterFor = (response: Response | Error) => {
  const fetchImpl = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  }) as unknown as typeof fetch;
  return { fetchImpl, adapter: createRegulationAdapter({ fetcher: createFetcher({ fetchImpl, retryDelayMs: 0 }) }) };
};

describe("regulation client adapter", () => {
  it("calls only the same-origin /api/regulacion route and maps items with their provenance", async () => {
    const { adapter, fetchImpl } = adapterFor(new Response(JSON.stringify(body), { status: 200 }));
    const result = await adapter.fetch({}, { now: NOW });
    expect(vi.mocked(fetchImpl).mock.calls[0][0]).toBe("/api/regulacion");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { minambiente, presidencia } = result.value.data;
    expect(minambiente.items[0].provenance).toMatchObject({ sourceId: "minambiente", url: "https://www.minambiente.gov.co/x/" });
    expect(presidencia.items).toHaveLength(1);
    expect(presidencia.items[0].provenance).toMatchObject({ sourceId: "presidencia", license: "CC BY-SA 4.0" });
    expect(presidencia.items[0].provenance.url).toContain("88h2-dykw");
  });

  it("keeps a source that failed on the server as an error block, not as a failure of the whole call", async () => {
    const partial = { ...body, minambiente: { status: "error", items: [], httpStatus: 503, message: "La fuente respondió con el estado 503." } };
    const { adapter } = adapterFor(new Response(JSON.stringify(partial), { status: 200 }));
    const result = await adapter.fetch({}, { now: NOW });
    expect(result.ok && result.value.data.minambiente).toMatchObject({ status: "error", message: "La fuente respondió con el estado 503." });
  });

  it("reports the source as disabled when both are switched off", async () => {
    const off = { ...body, minambiente: { status: "disabled", items: [] }, presidencia: { status: "disabled", items: [] } };
    const { adapter } = adapterFor(new Response(JSON.stringify(off), { status: 200 }));
    expect(await adapter.fetch({}, { now: NOW })).toMatchObject({ ok: false, error: { kind: "disabled" } });
  });

  it("reports schema, HTTP and network errors", async () => {
    expect(await adapterFor(new Response(JSON.stringify({ nope: 1 }), { status: 200 })).adapter.fetch({}, { now: NOW })).toMatchObject({ ok: false, error: { kind: "schema" } });
    expect(await adapterFor(new Response("x", { status: 400 })).adapter.fetch({}, { now: NOW })).toMatchObject({ ok: false, error: { kind: "network", status: 400 } });
    expect(await adapterFor(new Error("offline")).adapter.fetch({}, { now: NOW })).toMatchObject({ ok: false, error: { kind: "network" } });
  });
});
