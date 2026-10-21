const pct = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
const pct1 = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

/** "2,64 %" */
export function formatPct(value: number): string {
  return `${pct.format(value)} %`;
}

/** Same as `formatPct` with at most one decimal. */
export function formatPct1(value: number): string {
  return `${pct1.format(value)} %`;
}

/** Quarter label from the quarter-end date: "2026-06-30" becomes "T2 2026". */
export function formatQuarter(date: string): string {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(date);
  if (!match) return date;
  return `T${Math.ceil(Number(match[2]) / 3)} ${match[1]}`;
}

export function formatMillionsUsd(value: number): string {
  return integer.format(value);
}

/** The newest item and the one before it, from a list ordered oldest first. */
export function lastTwo<T>(items: readonly T[]): { latest: T | undefined; previous: T | undefined } {
  return { latest: items.at(-1), previous: items.at(-2) };
}
