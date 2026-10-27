import { describe, expect, it } from "vitest";
import type { Observation } from "@/core/domain/observation";
import { observationEvents } from "./observation-events";

const prov = { sourceId: "world-bank", url: "https://x.test", fetchedAt: "2026-10-20T00:00:00.000Z", license: "CC BY 4.0", attribution: "Banco Mundial" } as const;
const obs = (date: string, value: number): Observation => ({ indicatorId: "pib", date, value, unit: "%", provenance: prov });

describe("observationEvents", () => {
  it("returns newest first, each with the change against the previous observation", () => {
    const events = observationEvents([obs("2023", 1), obs("2024", 1.49), obs("2025", 2.64)], { mode: "points", period: (o) => o.date, value: (o) => `${o.value} %` });

    expect(events.map((event) => event.period)).toEqual(["2025", "2024", "2023"]);
    expect(events[0]).toMatchObject({ value: "2.64 %", change: "+1,15 pts" });
    expect(events[2].change).toBeUndefined();
  });

  it("expresses the change as a percentage for amounts", () => {
    const events = observationEvents([obs("2026-03-31", 6000), obs("2026-06-30", 6600)], { mode: "percent", period: (o) => o.date, value: (o) => String(o.value) });

    expect(events[0].change).toBe("+10,0 %");
  });

  it("anchors the event at the end of the period in an ISO instant", () => {
    const [annual] = observationEvents([obs("2025", 2)], { mode: "points", period: (o) => o.date, value: (o) => String(o.value) });
    const [daily] = observationEvents([obs("2026-10-19", 2)], { mode: "points", period: (o) => o.date, value: (o) => String(o.value) });

    expect(annual.at).toBe("2025-12-31T12:00:00.000Z");
    expect(daily.at).toBe("2026-10-19T12:00:00.000Z");
  });

  it("keeps only the latest events when a limit is given", () => {
    const list = Array.from({ length: 20 }, (_, index) => obs(`20${String(index).padStart(2, "0")}`, index));

    expect(observationEvents(list, { mode: "points", period: (o) => o.date, value: (o) => String(o.value), limit: 5 })).toHaveLength(5);
  });
});
