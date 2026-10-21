import type { Alert } from "../domain/alert";
import type { Briefing } from "../domain/briefing";
import type { Result } from "../domain/result";
import type { Signal } from "../domain/signal";
import { DIMENSION_ORDER } from "../labels";
import type { Clock } from "../ports/clock";
import { addDaysToKey, bogotaDateKey, bogotaStartOfDay } from "../time/bogota";
import { compareSignals } from "./detect-signals";

export const BRIEFING_NOTE = "generado por reglas, sin IA" as const;

export interface BriefingError {
  message: string;
}

/** A custom range, in Bogota calendar days, both ends included. */
export interface CustomRange {
  fromDate: string;
  toDate: string;
}

export interface BriefingPeriod {
  /** Start instant (Monday 00:00 Bogota for the default week). */
  from: string;
  /** Last instant included (23:59:59.999 of the last day, Bogota). */
  to: string;
  fromDate: string;
  toDate: string;
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const isValidKey = (key: string) =>
  DATE_KEY.test(key) && !Number.isNaN(Date.parse(`${key}T00:00:00Z`)) && addDaysToKey(key, 0) === key;

function periodFromDates(fromDate: string, toDate: string): BriefingPeriod {
  return {
    from: bogotaStartOfDay(fromDate).toISOString(),
    to: new Date(bogotaStartOfDay(addDaysToKey(toDate, 1)).getTime() - 1).toISOString(),
    fromDate,
    toDate,
  };
}

/**
 * Previous calendar week (Monday 00:00 to Sunday 23:59:59 in Bogota) unless a custom range is given.
 */
export function resolveBriefingPeriod(now: Date, custom?: CustomRange): Result<BriefingPeriod, BriefingError> {
  if (custom) {
    if (!isValidKey(custom.fromDate) || !isValidKey(custom.toDate)) {
      return { ok: false, error: { message: "Las fechas del período no son válidas." } };
    }
    if (custom.fromDate > custom.toDate) {
      return { ok: false, error: { message: "La fecha inicial debe ser anterior o igual a la final." } };
    }
    return { ok: true, value: periodFromDates(custom.fromDate, custom.toDate) };
  }

  const today = bogotaDateKey(now);
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  const thisMonday = addDaysToKey(today, -((weekday + 6) % 7));
  const previousMonday = addDaysToKey(thisMonday, -7);
  return { ok: true, value: periodFromDates(previousMonday, addDaysToKey(previousMonday, 6)) };
}

export interface BuildBriefingInput {
  signals: readonly Signal[];
  alerts: readonly Alert[];
  clock: Clock;
  custom?: CustomRange;
}

/** Groups the signals of the period by dimension and adds the alerts touched during it. */
export function buildBriefing({ signals, alerts, clock, custom }: BuildBriefingInput): Result<Briefing, BriefingError> {
  const now = clock.now();
  const period = resolveBriefingPeriod(now, custom);
  if (!period.ok) return period;

  const from = Date.parse(period.value.from);
  const to = Date.parse(period.value.to);
  const inPeriod = (iso: string) => {
    const time = Date.parse(iso);
    return time >= from && time <= to;
  };

  const sections = DIMENSION_ORDER.flatMap((dimension) => {
    const inDimension = signals
      .filter((signal) => signal.dimension === dimension && inPeriod(signal.occurredAt))
      .sort(compareSignals);
    return inDimension.length > 0 ? [{ dimension, signals: inDimension }] : [];
  });

  const touched = alerts
    .filter((alert) => inPeriod(alert.createdAt) || inPeriod(alert.updatedAt))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || a.signalId.localeCompare(b.signalId));

  return {
    ok: true,
    value: {
      periodFrom: period.value.from,
      periodTo: period.value.to,
      generatedAt: now.toISOString(),
      sections,
      alerts: touched,
      note: BRIEFING_NOTE,
    },
  };
}
