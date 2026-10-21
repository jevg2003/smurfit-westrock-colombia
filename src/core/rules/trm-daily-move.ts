import type { Signal } from "../domain/signal";
import { floatingToBogotaIso } from "../time/bogota";
import { pestelForRule } from "./pestel-mapping";

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

export const TRM_DAILY_MOVE_RULE_ID = "trm.daily-move.v1";

const TRM_SOURCE_URL = "https://www.datos.gov.co/resource/mcec-87by.json";

/** Deterministic signal id for a TRM day. */
export function trmDaySignalId(date: string): string {
  return `${TRM_DAILY_MOVE_RULE_ID}:trm:${date}`;
}

export interface TrmSignalThresholds {
  /** Daily move (percent) from which a day raises a signal. Inclusive. */
  trmDailyMovePct: number;
  /** Daily move (percent) from which the signal is an alert. Inclusive. */
  trmDailyAlertPct: number;
}

export interface DetectTrmSignalsInput {
  records: readonly TrmInputRecord[];
  thresholds: TrmSignalThresholds;
  /** ISO 8601 UTC instant at which the data was read. */
  fetchedAt: string;
}

/**
 * Signals for atypical TRM days: `watch` from the move threshold, `alert` from the alert level.
 * Uses the same signal id as a day saved by the user, so a saved day is not raised as new again.
 */
export function detectTrmDailyMoveSignals({ records, thresholds, fetchedAt }: DetectTrmSignalsInput): Signal[] {
  return computeTrmDailyMoves(records, thresholds.trmDailyMovePct).flatMap((move): Signal[] => {
    if (!move.isAtypical || move.changePct === null) return [];
    const pct = Math.abs(move.changePct).toFixed(2).replace(".", ",");
    const direction = move.changePct > 0 ? "subió" : "bajó";
    return [
      {
        ...buildTrmDaySignal({ date: move.date, thresholdPct: thresholds.trmDailyMovePct, fetchedAt }),
        // The source date has no zone; anchor it to Bogota so it sorts with other signals.
        occurredAt: floatingToBogotaIso(move.date) ?? move.date,
        severity: Math.abs(move.changePct) >= thresholds.trmDailyAlertPct ? "alert" : "watch",
        title: `La TRM ${direction} ${pct}% el ${move.date.slice(0, 10)}`,
        detail: `Cerró en COP ${move.value} frente al día anterior. Alerta desde ${thresholds.trmDailyAlertPct}%.`,
      },
    ];
  });
}

export interface TrmDaySignalInput {
  date: string;
  thresholdPct?: number;
  /** ISO 8601 UTC instant at which the data was read. */
  fetchedAt: string;
}

/** Signal snapshot for a TRM day (used when a day is saved as an alert). */
export function buildTrmDaySignal({
  date,
  thresholdPct = DEFAULT_TRM_DAILY_MOVE_PCT,
  fetchedAt,
}: TrmDaySignalInput): Signal {
  return {
    id: trmDaySignalId(date),
    ruleId: TRM_DAILY_MOVE_RULE_ID,
    ruleText: `Variación diaria de la TRM de ${thresholdPct}% o más frente al día anterior`,
    dimension: "macro",
    pestel: pestelForRule(TRM_DAILY_MOVE_RULE_ID),
    severity: "info",
    kind: "event",
    title: `TRM del ${date.slice(0, 10)}`,
    detail: "Día de la TRM guardado como alerta.",
    occurredAt: date,
    evidence: [{ kind: "observation", ref: `trm:${date}` }],
    provenance: [
      {
        sourceId: "trm",
        url: TRM_SOURCE_URL,
        fetchedAt,
        license: "CC BY-SA 4.0",
        attribution: "Superintendencia Financiera de Colombia vía datos.gov.co",
      },
    ],
  };
}
