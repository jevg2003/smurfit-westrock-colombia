import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Props {
  paginaActual: number;
  totalPaginas: number;
  onCambiar: (pagina: number) => void;
}

function construirPaginas(actual: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);

  const paginas = new Set([0, total - 1, actual - 1, actual, actual + 1]);
  const ordenadas = Array.from(paginas)
    .filter((p) => p >= 0 && p < total)
    .sort((a, b) => a - b);

  const resultado: (number | "…")[] = [];
  ordenadas.forEach((pagina, indice) => {
    if (indice > 0 && pagina - ordenadas[indice - 1] > 1) resultado.push("…");
    resultado.push(pagina);
  });
  return resultado;
}

export function PaginacionGoogle({ paginaActual, totalPaginas, onCambiar }: Props) {
  if (totalPaginas <= 1) return null;

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (paginaActual > 0) onCambiar(paginaActual - 1);
            }}
            className={paginaActual === 0 ? "pointer-events-none opacity-50" : undefined}
          />
        </PaginationItem>

        {construirPaginas(paginaActual, totalPaginas).map((pagina, indice) =>
          pagina === "…" ? (
            <PaginationItem key={`ellipsis-${indice}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={pagina}>
              <PaginationLink
                href="#"
                isActive={pagina === paginaActual}
                onClick={(e) => {
                  e.preventDefault();
                  onCambiar(pagina);
                }}
              >
                {pagina + 1}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (paginaActual < totalPaginas - 1) onCambiar(paginaActual + 1);
            }}
            className={paginaActual === totalPaginas - 1 ? "pointer-events-none opacity-50" : undefined}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
