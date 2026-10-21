import { addMonths, addYears, subMonths, subYears } from "date-fns";
import { addDaysToKey } from "@/core/time/bogota";
import { dateToKey, keyToDate, type DayRange } from "./day-keys";

export type DateDirection = "past" | "future";

export interface DatePreset {
  label: string;
  value: string;
}

/** Shortcuts for a single day, counted from `today` (a Bogota day key). */
export function datePresets(today: string, direction: DateDirection): DatePreset[] {
  const base = keyToDate(today);
  if (direction === "future") {
    return [
      { label: "Hoy", value: today },
      { label: "Mañana", value: addDaysToKey(today, 1) },
      { label: "En una semana", value: addDaysToKey(today, 7) },
      { label: "En un mes", value: dateToKey(addMonths(base, 1)) },
      { label: "En un año", value: dateToKey(addYears(base, 1)) },
    ];
  }
  return [
    { label: "Hoy", value: today },
    { label: "Ayer", value: addDaysToKey(today, -1) },
    { label: "Hace una semana", value: addDaysToKey(today, -7) },
    { label: "Hace un mes", value: dateToKey(subMonths(base, 1)) },
    { label: "Hace un año", value: dateToKey(subYears(base, 1)) },
  ];
}

export type RangePresetId = "last-week" | "last-7" | "last-month" | "last-12-months";

export interface RangePreset {
  id: RangePresetId;
  label: string;
  range: DayRange;
}

/** Monday of the week that contains the Bogota day key (Monday-first weeks). */
function mondayOf(key: string): string {
  const weekday = new Date(`${key}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDaysToKey(key, -((weekday + 6) % 7));
}

/** Period shortcuts ending today; "last week" is the previous full Monday to Sunday. */
export function rangePresets(today: string): RangePreset[] {
  const base = keyToDate(today);
  const lastMonday = addDaysToKey(mondayOf(today), -7);
  return [
    { id: "last-week", label: "Semana pasada (lun–dom)", range: { fromDate: lastMonday, toDate: addDaysToKey(lastMonday, 6) } },
    { id: "last-7", label: "Últimos 7 días", range: { fromDate: addDaysToKey(today, -6), toDate: today } },
    { id: "last-month", label: "Último mes", range: { fromDate: dateToKey(subMonths(base, 1)), toDate: today } },
    { id: "last-12-months", label: "Últimos 12 meses", range: { fromDate: dateToKey(subMonths(base, 12)), toDate: today } },
  ];
}

export function matchRangePreset(range: DayRange | undefined, today: string): RangePresetId | undefined {
  if (!range) return undefined;
  return rangePresets(today).find((preset) => preset.range.fromDate === range.fromDate && preset.range.toDate === range.toDate)?.id;
}
