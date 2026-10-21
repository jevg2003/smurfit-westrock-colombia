import { describe, expect, it } from "vitest";
import type { PublicContract } from "@/core/domain/contract";
import { contractExpiry } from "./contract-expiry";

const NOW = new Date("2026-10-20T15:00:00.000Z");
const THRESHOLDS = { watchDays: 90, alertDays: 30 };

const contract = (overrides: Partial<PublicContract>): PublicContract => ({
  id: "c",
  entity: "e",
  supplierNit: "890300406",
  supplierName: "s",
  value: 1,
  signedAt: "2026-01-01T00:00:00.000-05:00",
  status: "En ejecución",
  provenance: { sourceId: "secop", url: "u", fetchedAt: "2026-10-20T00:00:00.000Z", license: "l", attribution: "a" },
  ...overrides,
});

describe("contractExpiry", () => {
  it("marks 91 days as in force and 90 as watch", () => {
    expect(contractExpiry(contract({ endsAt: "2027-01-19T00:00:00.000-05:00" }), NOW, THRESHOLDS)).toMatchObject({ level: "ok" });
    expect(contractExpiry(contract({ endsAt: "2027-01-18T00:00:00.000-05:00" }), NOW, THRESHOLDS)).toMatchObject({
      level: "watch",
      label: "Vence en 90 días",
    });
  });

  it("marks 30 days as alert and today as expiring today", () => {
    expect(contractExpiry(contract({ endsAt: "2026-11-19T00:00:00.000-05:00" }), NOW, THRESHOLDS)).toMatchObject({ level: "alert" });
    expect(contractExpiry(contract({ endsAt: "2026-10-20T00:00:00.000-05:00" }), NOW, THRESHOLDS)).toMatchObject({
      level: "alert",
      label: "Vence hoy",
    });
  });

  it("handles finished, past and missing end dates", () => {
    expect(contractExpiry(contract({ status: "Terminado", endsAt: "2026-11-01T00:00:00.000-05:00" }), NOW, THRESHOLDS).label).toBe("Terminado");
    expect(contractExpiry(contract({ endsAt: "2026-10-19T00:00:00.000-05:00" }), NOW, THRESHOLDS).label).toBe("Ya venció");
    expect(contractExpiry(contract({}), NOW, THRESHOLDS).label).toBe("Sin fecha de fin");
  });
});
