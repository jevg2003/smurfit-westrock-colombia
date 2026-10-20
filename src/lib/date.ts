const formatterFecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" });

export function formatFecha(valor?: string): string {
  if (!valor) return "Sin fecha";
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? "Sin fecha" : formatterFecha.format(fecha);
}
