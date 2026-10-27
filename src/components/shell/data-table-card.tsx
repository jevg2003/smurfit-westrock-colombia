"use client";

import { type ColumnDef, type PaginationState, type RowData, type SortingState, useTable } from "@tanstack/react-table";
import { type ReactNode, useState } from "react";
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from "@/components/reui/data-grid/data-grid";
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination";
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area";
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table";
import { Card } from "@/components/ui/card";

interface Props<T extends RowData> {
  title: string;
  icon: ReactNode;
  description?: ReactNode;
  rows: T[];
  columns: ColumnDef<DataGridFeatures, T>[];
  getRowId: (row: T) => string;
  initialSort?: SortingState;
  /** Buttons at the right of the header. */
  actions?: ReactNode;
  /** Filters row under the header. */
  toolbar?: ReactNode;
  /** Plural noun for the pager, for example "avisos". */
  countLabel: string;
  emptyMessage: ReactNode;
  onRowClick?: (row: T) => void;
  footer?: ReactNode;
}

/** Card with a header, a ReUI data grid, a pager and an optional footer. */
export function DataTableCard<T extends RowData>({
  title,
  icon,
  description,
  rows,
  columns,
  getRowId,
  initialSort = [],
  actions,
  toolbar,
  countLabel,
  emptyMessage,
  onRowClick,
  footer,
}: Props<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSort);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const table = useTable({
    features: dataGridFeatures,
    columns,
    data: rows,
    pageCount: Math.ceil(rows.length / pagination.pageSize),
    getRowId,
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
  });

  return (
    <Card className="min-w-0 gap-0 py-0">
      <div className="flex flex-col gap-3 border-b px-4 py-3 lg:min-h-14 lg:flex-row lg:items-center lg:gap-4 lg:py-0">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-2 text-muted-foreground [&_svg:not([class*=size-])]:size-4">
            {icon}
            <h2 className="truncate text-sm font-medium text-foreground">{title}</h2>
          </div>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex min-w-0 flex-wrap items-center gap-2 lg:ml-auto">{actions}</div>}
      </div>

      {toolbar && <div className="border-b px-4 py-3">{toolbar}</div>}

      <DataGrid
        table={table}
        recordCount={rows.length}
        emptyMessage={emptyMessage}
        tableLayout={{ headerBackground: false }}
        onRowClick={onRowClick}
      >
        <DataGridContainer>
          <DataGridScrollArea>
            <DataGridTable />
          </DataGridScrollArea>
        </DataGridContainer>
        <div className="border-t px-4 py-3">
          <DataGridPagination
            sizes={[10, 25, 50]}
            rowsPerPageLabel="Filas por página"
            info={`{from} - {to} de {count} ${countLabel}`}
            previousPageLabel="Ir a la página anterior"
            nextPageLabel="Ir a la página siguiente"
          />
        </div>
      </DataGrid>

      {footer && <div className="border-t bg-muted/50 px-4 py-2 text-xs text-muted-foreground">{footer}</div>}
    </Card>
  );
}
