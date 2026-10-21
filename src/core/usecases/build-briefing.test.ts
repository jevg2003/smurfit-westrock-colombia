import { describe, expect, it } from "vitest";
import { BRIEFING_NOTE, buildBriefing, resolveBriefingPeriod } from "./build-briefing";
import { clock, makeAlert, makeBriefingSignal } from "./test-data";

// "Now" is Tuesday 2026-10-20 in Bogota, so the previous week is Mon 2026-10-12 .. Sun 2026-10-18.
const FROM = "2026-10-12T05:00:00.000Z"; // Monday 00:00 Bogota
const NEXT_MONDAY = "2026-10-19T05:00:00.000Z";

describe("resolveBriefingPeriod", () => {
  it("defaults to the previous calendar week, Monday 00:00 to Sunday 23:59:59 Bogota", () => {
    const result = resolveBriefingPeriod(clock.now());
    expect(result).toEqual({
      ok: true,
      value: { from: FROM, to: "2026-10-19T04:59:59.999Z", fromDate: "2026-10-12", toDate: "2026-10-18" },
    });
  });

  it("uses the previous week when now is Monday 00:00 Bogota exactly", () => {
    const result = resolveBriefingPeriod(new Date("2026-10-19T05:00:00.000Z"));
    expect(result.ok && result.value.fromDate).toBe("2026-10-12");
  });

  it("still belongs to the earlier week one millisecond before Monday 00:00 Bogota", () => {
    const result = resolveBriefingPeriod(new Date("2026-10-19T04:59:59.999Z"));
    expect(result.ok && result.value.fromDate).toBe("2026-10-05");
  });

  it("handles a Sunday as part of the current week", () => {
    const result = resolveBriefingPeriod(new Date("2026-10-18T20:00:00.000Z"));
    expect(result.ok && result.value.toDate).toBe("2026-10-11");
  });

  it("accepts a custom range in Bogota days, inclusive", () => {
    const result = resolveBriefingPeriod(clock.now(), { fromDate: "2026-10-01", toDate: "2026-10-03" });
    expect(result).toEqual({
      ok: true,
      value: {
        from: "2026-10-01T05:00:00.000Z",
        to: "2026-10-04T04:59:59.999Z",
        fromDate: "2026-10-01",
        toDate: "2026-10-03",
      },
    });
  });

  it("rejects a reversed or malformed custom range", () => {
    expect(resolveBriefingPeriod(clock.now(), { fromDate: "2026-10-03", toDate: "2026-10-01" }).ok).toBe(false);
    expect(resolveBriefingPeriod(clock.now(), { fromDate: "ayer", toDate: "hoy" }).ok).toBe(false);
  });
});

describe("buildBriefing", () => {
  const signals = [
    makeBriefingSignal("before", "2026-10-12T04:59:59.999Z"), // Sunday 23:59:59.999 of the week before
    makeBriefingSignal("monday", FROM),
    makeBriefingSignal("sunday", "2026-10-19T04:59:59.000Z", { dimension: "macro", severity: "alert" }),
    makeBriefingSignal("after", NEXT_MONDAY),
    makeBriefingSignal("mid", "2026-10-15T15:00:00.000Z", { dimension: "competitors" }),
  ];

  function build(custom?: { fromDate: string; toDate: string }) {
    const result = buildBriefing({
      signals,
      alerts: [
        makeAlert(signals[2], { state: "reviewed", note: "ok", createdAt: "2026-10-01T05:00:00.000Z", updatedAt: "2026-10-16T12:00:00.000Z" }),
        makeAlert(signals[0], { createdAt: "2026-09-01T05:00:00.000Z", updatedAt: "2026-09-01T05:00:00.000Z" }),
      ],
      clock,
      custom,
    });
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
  }

  it("keeps only signals inside the previous week, boundaries included", () => {
    const briefing = build();
    const ids = briefing.sections.flatMap((section) => section.signals.map((signal) => signal.id)).sort();
    expect(ids).toEqual(["mid", "monday", "sunday"]);
  });

  it("groups by dimension in a fixed order, most severe first inside each group", () => {
    const briefing = build();
    expect(briefing.sections.map((section) => section.dimension)).toEqual(["procurement", "competitors", "macro"]);
  });

  it("includes the alerts touched during the period and the fixed note", () => {
    const briefing = build();
    expect(briefing.alerts.map((alert) => alert.signalId)).toEqual(["sunday"]);
    expect(briefing.note).toBe(BRIEFING_NOTE);
    expect(briefing.note).toBe("generado por reglas, sin IA");
    expect(briefing.generatedAt).toBe("2026-10-20T15:00:00.000Z");
    expect(briefing.periodFrom).toBe(FROM);
  });

  it("supports a custom range", () => {
    const briefing = build({ fromDate: "2026-10-15", toDate: "2026-10-15" });
    expect(briefing.sections.flatMap((section) => section.signals.map((signal) => signal.id))).toEqual(["mid"]);
  });

  it("returns an error for an invalid custom range", () => {
    const result = buildBriefing({ signals, alerts: [], clock, custom: { fromDate: "x", toDate: "y" } });
    expect(result.ok).toBe(false);
  });

  it("returns no sections for a quiet week", () => {
    const result = buildBriefing({ signals: [], alerts: [], clock });
    expect(result.ok && result.value.sections).toEqual([]);
  });
});
