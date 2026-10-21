/** "1 día" / "72 días". */
export function daysLabel(days: number): string {
  return days === 1 ? "1 día" : `${days} días`;
}

/** Colombian pesos with thousands dots, for example "COP 807.534.110". Deterministic (no Intl). */
export function formatCop(value: number): string {
  const rounded = Math.round(value);
  const digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `COP ${rounded < 0 ? "-" : ""}${digits}`;
}
