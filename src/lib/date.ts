const formatterFecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" });

export function formatFecha(valor?: string): string {
  if (!valor) return "Sin fecha";
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? "Sin fecha" : formatterFecha.format(fecha);
}

const formatterDiaBogota = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "America/Bogota" });
const formatterHoraBogota = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

/** Calendar day of an instant, always in Bogota time (stable whatever the browser zone is). */
export function formatDiaBogota(valor?: string): string {
  if (!valor) return "Sin fecha";
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? "Sin fecha" : formatterDiaBogota.format(fecha);
}

/** Day and time of an instant in Bogota time. */
export function formatHoraBogota(valor?: string): string {
  if (!valor) return "Sin fecha";
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? "Sin fecha" : formatterHoraBogota.format(fecha);
}
