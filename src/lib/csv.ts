export function exportarCsv<T extends object>(filas: T[], nombreArchivo: string): void {
  if (filas.length === 0) return;

  const columnas = Object.keys(filas[0]) as (keyof T)[];
  const escapar = (valor: unknown) => {
    const texto = valor === null || valor === undefined ? "" : String(valor);
    return texto.includes(",") || texto.includes('"') || texto.includes("\n")
      ? `"${texto.replace(/"/g, '""')}"`
      : texto;
  };

  const lineas = [
    columnas.join(","),
    ...filas.map((fila) => columnas.map((columna) => escapar(fila[columna])).join(",")),
  ];

  const blob = new Blob([lineas.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(url);
}
