"use client";

import { Filters } from "@/components/reui/filters/filters";
import type { FilterField, FilterQuery } from "@/components/reui/filters/filters-types";
import { FILTER_LABELS_ES, FILTER_OPERATOR_LABELS_ES } from "./labels-es";

interface Props {
  fields: FilterField[];
  query: FilterQuery;
  onQueryChange: (query: FilterQuery) => void;
}

/** ReUI filter chips with Spanish copy. */
export function SelectFilters({ fields, query, onQueryChange }: Props) {
  return (
    <Filters
      fields={fields}
      query={query}
      onQueryChange={onQueryChange}
      labels={FILTER_LABELS_ES}
      operatorLabels={FILTER_OPERATOR_LABELS_ES}
      size="sm"
      showClear
    />
  );
}
