import { describe, expect, it } from "vitest";
import { resolvePestelPeriod } from "./period";

const NOW = new Date("2026-10-20T15:00:00.000Z"); // Tuesday 2026-10-20 in Bogota

describe("resolvePestelPeriod", () => {
  it("covers the last N Bogota days including today", () => {
    const result = resolvePestelPeriod(NOW, "30");
    expect(result).toMatchObject({ ok: true, value: { fromDate: "2026-09-21", toDate: "2026-10-20" } });
    if (result.ok) {
      expect(result.value.from).toBe("2026-09-21T05:00:00.000Z");
      expect(result.value.to).toBe("2026-10-21T04:59:59.999Z");
    }
  });

  it("uses 7 and 90 days", () => {
    expect(resolvePestelPeriod(NOW, "7")).toMatchObject({ ok: true, value: { fromDate: "2026-10-14" } });
    expect(resolvePestelPeriod(NOW, "90")).toMatchObject({ ok: true, value: { fromDate: "2026-07-23" } });
  });

  it("uses a custom range and falls back to 30 days when it is missing", () => {
    expect(resolvePestelPeriod(NOW, "custom", { fromDate: "2026-10-01", toDate: "2026-10-10" })).toMatchObject({
      ok: true,
      value: { fromDate: "2026-10-01", toDate: "2026-10-10" },
    });
    expect(resolvePestelPeriod(NOW, "custom")).toMatchObject({ ok: true, value: { fromDate: "2026-09-21" } });
  });
});
