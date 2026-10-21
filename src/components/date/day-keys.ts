/** Inclusive range of calendar day keys (`YYYY-MM-DD`). */
export interface DayRange {
  fromDate: string;
  toDate: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The calendar works with local dates; read one back as a plain day key. */
export const dateToKey = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** A day key as a local date at midnight, so the calendar shows the same day in any browser zone. */
export function keyToDate(key: string): Date {
  const [year = 0, month = 1, day = 1] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}
