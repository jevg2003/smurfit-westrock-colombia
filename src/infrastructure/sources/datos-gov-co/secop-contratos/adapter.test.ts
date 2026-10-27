import { describe, expect, it, vi } from "vitest";
import { watchedNits } from "@/core/company/profile";
import { TEST_COMPANY } from "@/core/company/test-fixtures";
import { createFetcher } from "@/infrastructure/http/fetcher";
import sample from "./fixtures/secop-contratos.sample.json";
import { SECOP_DATASET_URL, buildSecopUrl, createSecopContractsAdapter } from "./adapter";

const NITS = watchedNits(TEST_COMPANY);
const NOW = new Date("2026-10-20T15:00:00.000Z");

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function adapterWith(fetchImpl: typeof fetch) {
  return createSecopContractsAdapter({ fetcher: createFetcher({ fetchImpl, retryDelayMs: 0 }) });
}

describe("buildSecopUrl", () => {
  it("filters by supplier NIT and signing date, never with LIKE", () => {
    const url = decodeURIComponent(buildSecopUrl({ nits: NITS }, NOW));
    expect(url.startsWith(`${SECOP_DATASET_URL}?`)).toBe(true);
    expect(url).toContain("$where=documento_proveedor in('900000001','900000002','900000003','900000004')");
    expect(url).toContain("fecha_de_firma>'2025-10-20T00:00:00.000'");
    expect(url).toContain("$order=fecha_de_firma DESC");
    expect(url).toMatch(/\$limit=\d+/);
    expect(url.toLowerCase()).not.toContain("like");
  });
});

describe("createSecopContractsAdapter", () => {
  it("maps the recorded response to public contracts with provenance", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(sample));
    const result = await adapterWith(fetchImpl).fetch({ nits: NITS }, { now: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.data).toHaveLength(4);
    const own = result.value.data.find((contract) => contract.id === "CO1.PCCNTR.9151243");
    expect(own).toMatchObject({
      entity: "INDUSTRIA LICORERA DEL CAUCA",
      supplierNit: "900000001",
      value: 807534110,
      signedAt: "2026-01-27T00:00:00.000-05:00",
      endsAt: "2026-12-31T00:00:00.000-05:00",
      status: "Modificado",
    });
    expect(own?.processUrl).toMatch(/^https:\/\/community\.secop\.gov\.co\//);
    expect(own?.provenance).toMatchObject({
      sourceId: "secop",
      license: "CC BY-SA 4.0",
      attribution: "Agencia Nacional de Contratación Pública - Colombia Compra Eficiente vía datos.gov.co",
      fetchedAt: NOW.toISOString(),
    });
    expect(result.value.provenance.sourceId).toBe("secop");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns rate_limited on a 429 without retrying", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, 429));
    const result = await adapterWith(fetchImpl).fetch({ nits: NITS }, { now: NOW });
    expect(result).toMatchObject({ ok: false, error: { sourceId: "secop", kind: "rate_limited", status: 429 } });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("returns network when the server keeps failing", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, 503));
    const result = await adapterWith(fetchImpl).fetch({ nits: NITS }, { now: NOW });
    expect(result).toMatchObject({ ok: false, error: { kind: "network", status: 503 } });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("returns network when the request throws", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    const result = await adapterWith(fetchImpl).fetch({ nits: NITS }, { now: NOW });
    expect(result).toMatchObject({ ok: false, error: { kind: "network" } });
  });

  it("returns schema when the payload has the wrong shape", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse([{ id_contrato: "x" }]));
    const result = await adapterWith(fetchImpl).fetch({ nits: NITS }, { now: NOW });
    expect(result).toMatchObject({ ok: false, error: { kind: "schema" } });
  });

  it("returns schema when the body is not JSON", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("<html>", { status: 200 }));
    const result = await adapterWith(fetchImpl).fetch({ nits: NITS }, { now: NOW });
    expect(result).toMatchObject({ ok: false, error: { kind: "schema" } });
  });

  it("returns empty for an empty list", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse([]));
    const result = await adapterWith(fetchImpl).fetch({ nits: NITS }, { now: NOW });
    expect(result).toMatchObject({ ok: false, error: { kind: "empty" } });
  });

  it("drops process links that are not http(s)", async () => {
    const row = { ...sample[0], urlproceso: { url: "javascript:alert(1)" } };
    const result = await adapterWith(vi.fn().mockResolvedValue(jsonResponse([row]))).fetch({ nits: NITS }, { now: NOW });
    expect(result.ok && result.value.data[0].processUrl).toBeUndefined();
  });

  it("keeps contracts without an end date", async () => {
    const { fecha_de_fin_del_contrato: _removed, ...row } = sample[0];
    const result = await adapterWith(vi.fn().mockResolvedValue(jsonResponse([row]))).fetch({ nits: NITS }, { now: NOW });
    expect(result.ok && result.value.data[0].endsAt).toBeUndefined();
  });

  it("rejects malformed NITs before calling the network", async () => {
    const fetchImpl = vi.fn();
    const result = await adapterWith(fetchImpl).fetch({ nits: ["1' OR 1=1"] }, { now: NOW });
    expect(result).toMatchObject({ ok: false, error: { kind: "unknown" } });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
