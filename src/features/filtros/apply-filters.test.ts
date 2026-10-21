import { describe, expect, it } from "vitest";
import { createFilterQuery, createFilterRule } from "@/components/reui/filters/filters-query";
import { applyFilters } from "./apply-filters";

type Row = { id: string; severity: string; dimension: string };

const rows: Row[] = [
  { id: "a", severity: "alert", dimension: "macro" },
  { id: "b", severity: "watch", dimension: "procurement" },
  { id: "c", severity: "watch", dimension: "macro" },
];
const accessors = {
  severity: (row: Row) => row.severity,
  dimension: (row: Row) => row.dimension,
};
const rule = (id: string, field: string, operator: string, value: string | string[]) =>
  createFilterRule({ id, path: [field], operator, value });

describe("applyFilters", () => {
  it("returns every row for an empty query", () => {
    expect(applyFilters(rows, createFilterQuery(), accessors)).toHaveLength(3);
  });

  it("combines conditions with AND", () => {
    const query = createFilterQuery([rule("1", "severity", "is", "watch"), rule("2", "dimension", "is", "macro")]);
    expect(applyFilters(rows, query, accessors).map((row) => row.id)).toEqual(["c"]);
  });

  it("supports exclusion and any-of operators", () => {
    expect(applyFilters(rows, createFilterQuery([rule("1", "severity", "is_not", "alert")]), accessors)).toHaveLength(2);
    expect(
      applyFilters(rows, createFilterQuery([rule("1", "dimension", "is_any_of", ["macro", "market"])]), accessors),
    ).toHaveLength(2);
  });

  it("ignores unfinished rules and unknown fields", () => {
    const query = createFilterQuery([rule("1", "severity", "", "alert"), rule("2", "other", "is", "x")]);
    expect(applyFilters(rows, query, accessors)).toHaveLength(3);
  });
});
