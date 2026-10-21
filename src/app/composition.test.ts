import { describe, expect, it, vi } from "vitest";
import { createFetcher } from "@/infrastructure/http/fetcher";
import sample from "@/infrastructure/sources/datos-gov-co/secop-contratos/fixtures/secop-contratos.sample.json";
import gdp from "@/infrastructure/sources/world-bank/fixtures/gdp-growth.col.json";
import { COMPANY, COMPETITORS } from "@/content/config/empresa";
import { createContainer } from "./composition";

describe("createContainer", () => {
  it("wires the SECOP adapter, the noop analyzer, a clock and a logger", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify(sample), { status: 200 }));
    const container = createContainer({ fetcher: createFetcher({ fetchImpl, retryDelayMs: 0 }) });

    const nits = [COMPANY.nit, ...COMPETITORS.map((competitor) => competitor.nit)];
    const result = await container.secop.fetch({ nits }, { now: container.clock.now() });
    expect(result.ok).toBe(true);

    const analysis = await container.analyzer.analyze({
      signal: {
        id: "s",
        ruleId: "r",
        ruleText: "t",
        dimension: "macro",
        pestel: "economic",
        severity: "info",
        kind: "event",
        title: "t",
        detail: "d",
        occurredAt: "2026-10-20T00:00:00.000Z",
        evidence: [],
        provenance: [],
      },
    });
    expect(analysis).toMatchObject({ ok: false, error: { kind: "disabled" } });
    expect(typeof container.logger.info).toBe("function");
  });

  it("wires the World Bank adapter", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify(gdp), { status: 200 }));
    const container = createContainer({ fetcher: createFetcher({ fetchImpl, retryDelayMs: 0 }) });
    const result = await container.worldBank.fetch({ indicator: "pib" }, { now: container.clock.now() });
    expect(result.ok).toBe(true);
  });
});
