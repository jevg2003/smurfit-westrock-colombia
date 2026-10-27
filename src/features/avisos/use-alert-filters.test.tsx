// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Alert, AlertState } from "@/core/domain/alert";
import { buildTrmDaySignal } from "@/core/rules/trm-daily-move";
import type { AlertRow } from "./alert-row";
import { useAlertFilters } from "./use-alert-filters";

const row = (day: string, state: AlertState): AlertRow => {
  const signal = buildTrmDaySignal({ date: `${day}T00:00:00.000`, fetchedAt: "2026-10-20T12:00:00.000Z" });
  const alert: Alert = { signalId: signal.id, signalSnapshot: signal, state, createdAt: "2026-10-20T12:00:00.000Z", updatedAt: "2026-10-20T12:00:00.000Z" };
  return { signal, alert };
};

const rows = [row("2026-10-01", "new"), row("2026-10-02", "reviewed"), row("2026-10-03", "dismissed")];
const states = (filtered: AlertRow[]) => filtered.map((item) => item.alert.state);

describe("useAlertFilters state default", () => {
  it("hides dismissed rows until the Estado filter asks for them", () => {
    const { result } = renderHook(() => useAlertFilters(rows, { withState: true }));
    expect(states(result.current.filtered)).toEqual(["new", "reviewed"]);
    expect(result.current.hiddenDismissed).toBe(1);
    expect(result.current.isFiltering).toBe(false);

    act(() => result.current.set("state", "dismissed"));
    expect(states(result.current.filtered)).toEqual(["dismissed"]);
    expect(result.current.hiddenDismissed).toBe(0);
    expect(result.current.isFiltering).toBe(true);
  });

  it("filters one state at a time", () => {
    const { result } = renderHook(() => useAlertFilters(rows, { withState: true }));

    act(() => result.current.set("state", "new"));
    expect(states(result.current.filtered)).toEqual(["new"]);
  });

  it("clears every filter back to the default view", () => {
    const { result } = renderHook(() => useAlertFilters(rows, { withState: true }));
    act(() => result.current.set("state", "dismissed"));
    act(() => result.current.set("severity", "alert"));
    act(() => result.current.clear());
    expect(states(result.current.filtered)).toEqual(["new", "reviewed"]);
    expect(result.current.isFiltering).toBe(false);
  });

  it("keeps every row where states are not shown", () => {
    const { result } = renderHook(() => useAlertFilters(rows, { withState: false }));
    expect(result.current.filtered).toHaveLength(3);
  });

  it("narrows by severity and by topic", () => {
    const { result } = renderHook(() => useAlertFilters(rows, { withState: false }));

    act(() => result.current.set("dimension", "regulation"));
    expect(result.current.filtered).toHaveLength(0);
    act(() => result.current.set("dimension", ""));
    act(() => result.current.set("severity", rows[0].signal.severity));
    expect(result.current.filtered.length).toBeGreaterThan(0);
  });
});
