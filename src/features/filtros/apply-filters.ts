import { flattenFilterConditions } from "@/components/reui/filters/filters-query";
import type { FilterQuery } from "@/components/reui/filters/filters-types";

const EXCLUDING = new Set(["is_not", "is_none_of"]);

/**
 * Keeps the rows that satisfy every complete condition of a flat ReUI filter query.
 * `accessors` maps a filter field id to the value of a row. Unknown fields are ignored.
 */
export function applyFilters<T>(
  rows: readonly T[],
  query: FilterQuery,
  accessors: Record<string, (row: T) => string>,
): T[] {
  const conditions = flattenFilterConditions(query).filter((condition) => condition.field in accessors);
  if (conditions.length === 0) return [...rows];

  return rows.filter((row) =>
    conditions.every((condition) => {
      const value = accessors[condition.field](row);
      const found = condition.values.map(String).includes(value);
      const excluding = EXCLUDING.has(condition.operator);
      return (excluding ? !found : found) !== condition.negated;
    }),
  );
}
