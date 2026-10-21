"use client";

import { DateRangeFilter } from "@/features/filtros/date-range-filter";
import { SelectFilters } from "@/features/filtros/select-filters";
import type { useRowFilters } from "./use-row-filters";

type Filters = ReturnType<typeof useRowFilters>;

/** Filter chips and date range shared by Señales and Alertas. */
export function AlertToolbar({ filters }: { filters: Filters }) {
  return (
    <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <SelectFilters fields={filters.fields} query={filters.query} onQueryChange={filters.setQuery} />
      </div>
      <div className="shrink-0">
        <DateRangeFilter value={filters.dates} onChange={filters.setDates} label="Fecha de la señal" />
      </div>
    </div>
  );
}
