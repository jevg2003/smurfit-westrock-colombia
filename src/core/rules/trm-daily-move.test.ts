import { describe, expect, it } from "vitest";
import { DEFAULT_TRM_DAILY_MOVE_PCT, computeTrmDailyMoves, type TrmInputRecord } from "./trm-daily-move";

const day = (validFrom: string, value: string | number): TrmInputRecord => ({ validFrom, value });

describe("computeTrmDailyMoves", () => {
  it("defaults the threshold to 1%", () => {
    expect(DEFAULT_TRM_DAILY_MOVE_PCT).toBe(1);
  });

  it("returns an empty list for no records", () => {
    expect(computeTrmDailyMoves([])).toEqual([]);
  });

  it("leaves the first day without change", () => {
    expect(computeTrmDailyMoves([day("2026-10-01", "4000")])).toEqual([
      { date: "2026-10-01", value: 4000, changePct: null, isAtypical: false },
    ]);
  });

  it("sorts ascending and measures against the previous day", () => {
    const moves = computeTrmDailyMoves([day("2026-10-02", 4020), day("2026-10-01", 4000)]);
    expect(moves.map((move) => move.date)).toEqual(["2026-10-01", "2026-10-02"]);
    expect(moves[1].changePct).toBeCloseTo(0.5, 10);
  });

  it("flags a move equal to the threshold and not one just below", () => {
    expect(computeTrmDailyMoves([day("a", 100), day("b", 101)])[1].isAtypical).toBe(true);
    expect(computeTrmDailyMoves([day("a", 100), day("b", 100.99)])[1].isAtypical).toBe(false);
  });

  it("flags drops using the absolute change", () => {
    expect(computeTrmDailyMoves([day("a", 4000), day("b", 3900)])[1].isAtypical).toBe(true);
  });

  it("accepts a custom threshold", () => {
    const records = [day("a", 100), day("b", 100.5)];
    expect(computeTrmDailyMoves(records, 0.5)[1].isAtypical).toBe(true);
    expect(computeTrmDailyMoves(records, 2)[1].isAtypical).toBe(false);
  });

  it("gives no change when the previous value is zero", () => {
    const moves = computeTrmDailyMoves([day("a", 0), day("b", 100)]);
    expect(moves[1].changePct).toBeNull();
    expect(moves[1].isAtypical).toBe(false);
  });

  it("does not mutate the input", () => {
    const input = [day("b", 2), day("a", 1)];
    computeTrmDailyMoves(input);
    expect(input.map((record) => record.validFrom)).toEqual(["b", "a"]);
  });
});
