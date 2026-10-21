const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

const formatter = new Intl.RelativeTimeFormat("es", { numeric: "always" });

/** "hace 5 minutos" style label; falls back to a short date after a week. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const diff = new Date(iso).getTime() - now.getTime();
  const abs = Math.abs(diff);
  if (abs < 60_000) return "hace un momento";
  if (abs >= 7 * 86_400_000) {
    return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: "America/Bogota" }).format(new Date(iso));
  }
  for (const [unit, ms] of UNITS) {
    if (abs >= ms) return formatter.format(Math.round(diff / ms), unit);
  }
  return "hace un momento";
}
