export function parseFecha(valor?: string): Date | null {
  if (!valor) return null;
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export function mesKey(valor?: string): string | null {
  const fecha = parseFecha(valor);
  if (!fecha) return null;
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
}

export function formatFecha(valor?: string): string {
  const fecha = parseFecha(valor);
  if (!fecha) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(fecha);
}

export function formatMes(mesKeyValor: string): string {
  const [anio, mes] = mesKeyValor.split("-");
  const fecha = new Date(Number(anio), Number(mes) - 1, 1);
  return new Intl.DateTimeFormat("es-CO", { month: "short", year: "numeric" }).format(fecha);
}
