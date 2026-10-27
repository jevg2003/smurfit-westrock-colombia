import { bogotaDateKey, daysBetweenKeys } from "@/core/time/bogota";

export interface DayGroup<T> {
  key: string;
  label: string;
  items: T[];
}

const DATE = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Bogota" });

/** Days before today (future dates count as today), or `null` without a valid date. */
function daysAgo(at: string, today: string): number | null {
  const instant = new Date(at);
  if (Number.isNaN(instant.getTime())) return null;
  return Math.max(0, daysBetweenKeys(bogotaDateKey(instant), today));
}

/**
 * Groups events under day headings (Hoy, Ayer, Esta semana, then one heading per date), newest first.
 * Days are Bogota calendar days. Items keep their order inside a group; undated items go last.
 */
export function groupByDay<T extends { at: string }>(items: readonly T[], now: Date = new Date()): DayGroup<T>[] {
  const today = bogotaDateKey(now);
  const groups = new Map<string, DayGroup<T> & { rank: number }>();

  for (const item of items) {
    const ago = daysAgo(item.at, today);
    let key: string;
    let label: string;
    let rank: number;
    if (ago === null) [key, label, rank] = ["none", "Sin fecha", Number.POSITIVE_INFINITY];
    else if (ago === 0) [key, label, rank] = ["today", "Hoy", 0];
    else if (ago === 1) [key, label, rank] = ["yesterday", "Ayer", 1];
    else if (ago < 7) [key, label, rank] = ["week", "Esta semana", 2];
    else [key, label, rank] = [bogotaDateKey(item.at), DATE.format(new Date(item.at)), ago];

    const group = groups.get(key) ?? { key, label, items: [], rank };
    group.items.push(item);
    groups.set(key, group);
  }

  return [...groups.values()].sort((a, b) => a.rank - b.rank).map(({ key, label, items: list }) => ({ key, label, items: list }));
}
