// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createFilterQuery, createFilterRule } from "@/components/reui/filters/filters-query";
import type { Alert, AlertState } from "@/core/domain/alert";
import { buildTrmDaySignal } from "@/core/rules/trm-daily-move";
import type { AlertRow } from "./alerts-grid";
import { useRowFilters } from "./use-row-filters";

const row = (day: string, state: AlertState): AlertRow => {
  const signal = buildTrmDaySignal({ date: `${day}T00:00:00.000`, fetchedAt: "2026-10-20T12:00:00.000Z" });
  const alert: Alert = { signalId: signal.id, signalSnapshot: signal, state, createdAt: "2026-10-20T12:00:00.000Z", updatedAt: "2026-10-20T12:00:00.000Z" };
  return { signal, alert };
};

const rows = [row("2026-10-01", "new"), row("2026-10-02", "reviewed"), row("2026-10-03", "dismissed")];
const states = (filtered: AlertRow[]) => filtered.map((item) => item.alert.state);
const dismissedOnly = () => createFilterQuery([createFilterRule({ id: "1", path: ["state"], operator: "is", value: "dismissed" })]);

describe("useRowFilters state default", () => {
  it("hides dismissed rows until the Estado filter asks for them", () => {
    const { result } = renderHook(() => useRowFilters(rows, { withState: true }));
    expect(states(result.current.filtered)).toEqual(["new", "reviewed"]);
    expect(result.current.hiddenDismissed).toBe(1);
    expect(result.current.isFiltering).toBe(false);

    act(() => result.current.setQuery(dismissedOnly()));
    expect(states(result.current.filtered)).toEqual(["dismissed"]);
    expect(result.current.hiddenDismissed).toBe(0);
    expect(result.current.isFiltering).toBe(true);
  });

  it("clears every filter back to the default view", () => {
    const { result } = renderHook(() => useRowFilters(rows, { withState: true }));
    act(() => result.current.setQuery(dismissedOnly()));
    act(() => result.current.clear());
    expect(states(result.current.filtered)).toEqual(["new", "reviewed"]);
  });

  it("keeps every row where states are not shown", () => {
    const { result } = renderHook(() => useRowFilters(rows, { withState: false }));
    expect(result.current.filtered).toHaveLength(3);
  });
});
