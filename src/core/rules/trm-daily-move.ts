/** Default daily move (in percent) from which a TRM day is flagged as atypical. */
export const DEFAULT_TRM_DAILY_MOVE_PCT = 1;

export interface TrmInputRecord {
  /** Start of validity, ISO date or datetime. Used for ordering. */
  validFrom: string;
  /** TRM value as published (COP per USD). */
  value: string | number;
}

export interface TrmDailyMove {
  date: string;
  value: number;
  /** Change against the previous day in percent, or null when there is no usable previous day. */
  changePct: number | null;
  isAtypical: boolean;
}

/**
 * Sorts records ascending by date and computes each day's change against the previous one.
 * A day is atypical when the absolute change is at least `thresholdPct`.
 */
export function computeTrmDailyMoves(
  records: readonly TrmInputRecord[],
  thresholdPct: number = DEFAULT_TRM_DAILY_MOVE_PCT,
): TrmDailyMove[] {
  const ascending = [...records].sort((a, b) => a.validFrom.localeCompare(b.validFrom));

  return ascending.map((record, index) => {
    const value = Number(record.value);
    const previous = index > 0 ? Number(ascending[index - 1].value) : null;
    const changePct = previous ? ((value - previous) / previous) * 100 : null;

    return {
      date: record.validFrom,
      value,
      changePct,
      isAtypical: changePct !== null && Math.abs(changePct) >= thresholdPct,
    };
  });
}
