import { toCsv, type CsvCell } from "@/core/format/csv";

export function exportarCsv<T extends object>(filas: T[], nombreArchivo: string): void {
  if (filas.length === 0) return;

  const columnas = Object.keys(filas[0]) as (keyof T)[];
  const contenido = toCsv(
    columnas.map(String),
    filas.map((fila) => columnas.map((columna) => fila[columna] as CsvCell)),
  );

  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(url);
}
