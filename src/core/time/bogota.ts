/**
 * Calendar helpers for America/Bogota. Colombia has no daylight saving time, so the zone is a
 * fixed UTC-5 offset and plain arithmetic is exact (no Intl needed, deterministic everywhere).
 */

const OFFSET_HOURS = -5;
const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** Calendar day key `YYYY-MM-DD` of an instant, in Bogota time. */
export function bogotaDateKey(input: Date | string): string {
  const instant = typeof input === "string" ? new Date(input) : input;
  return new Date(instant.getTime() + OFFSET_HOURS * HOUR_MS).toISOString().slice(0, 10);
}

/** Whole calendar days from `fromKey` to `toKey` (negative when `toKey` is earlier). */
export function daysBetweenKeys(fromKey: string, toKey: string): number {
  return Math.round((Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / DAY_MS);
}

/** Whole Bogota calendar days from `now` to `target`. */
export function daysUntil(target: Date | string, now: Date): number {
  return daysBetweenKeys(bogotaDateKey(now), bogotaDateKey(target));
}

/** The UTC instant at which the given Bogota calendar day starts (00:00:00.000). */
export function bogotaStartOfDay(dateKey: string): Date {
  return new Date(Date.parse(`${dateKey}T00:00:00Z`) - OFFSET_HOURS * HOUR_MS);
}

/** Adds (or subtracts) calendar days to a `YYYY-MM-DD` key. */
export function addDaysToKey(dateKey: string, days: number): string {
  return new Date(Date.parse(`${dateKey}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

const FLOATING = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}:\d{2})(?:\.(\d{1,3})\d*)?)?$/;

/**
 * Open-data portals publish timestamps without a zone ("2026-01-27T00:00:00.000"). They are
 * Colombian local times, so this anchors them to Bogota. Returns null when unusable.
 */
export function floatingToBogotaIso(value: string): string | null {
  const match = FLOATING.exec(value.trim());
  if (!match) return null;
  const [, date, time = "00:00:00", millis = "0"] = match;
  const iso = `${date}T${time}.${millis.padEnd(3, "0")}-05:00`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime()) || bogotaDateKey(parsed) !== date) return null;
  return iso;
}
