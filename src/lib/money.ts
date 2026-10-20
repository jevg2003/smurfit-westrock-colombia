const formatterCop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatCop(valor?: string | number): string {
  const numero = typeof valor === "string" ? Number(valor) : valor;
  if (!numero || Number.isNaN(numero)) return "—";
  return formatterCop.format(numero);
}

const formatterCopCompacto = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCopCompacto(valor?: string | number): string {
  const numero = typeof valor === "string" ? Number(valor) : valor;
  if (!numero || Number.isNaN(numero)) return "0";
  return formatterCopCompacto.format(numero);
}
