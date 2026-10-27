import { describe, expect, it } from "vitest";
import { z } from "zod";
import { fieldMeta } from "./schema-meta";

const schema = z
  .object({
    name: z.string().trim().min(1, "required").max(120),
    city: z.string().trim().max(80),
    count: z.number().int().min(1).max(50),
    tags: z.array(z.string().trim().min(1).max(40)).max(10),
    needed: z.array(z.string()).min(1),
    nit: z.union([z.literal(""), z.string().regex(/^\d+$/)]),
    maybe: z.string().max(5).optional(),
    nested: z.object({ note: z.string().min(2).max(30) }),
    rows: z.array(z.object({ title: z.string().min(1).max(20) })),
    custom: z.custom<"a" | "b">((value) => value === "a"),
  })
  .superRefine(() => {});

describe("fieldMeta", () => {
  it("marks a string with min 1 as required and reads its max", () => {
    expect(fieldMeta(schema, "name")).toMatchObject({ required: true, minLength: 1, maxLength: 120 });
  });

  it("marks a string with no minimum as optional", () => {
    expect(fieldMeta(schema, "city")).toMatchObject({ required: false, maxLength: 80 });
  });

  it("reads number bounds and integer", () => {
    expect(fieldMeta(schema, "count")).toMatchObject({ required: true, min: 1, max: 50, integer: true });
  });

  it("reads item counts of arrays", () => {
    expect(fieldMeta(schema, "tags")).toMatchObject({ required: false, maxItems: 10 });
    expect(fieldMeta(schema, "needed")).toMatchObject({ required: true, minItems: 1 });
  });

  it("reads the length limit of the items of an array", () => {
    expect(fieldMeta(schema, "tags").itemMaxLength).toBe(40);
  });

  it("treats a union that accepts the empty string as optional", () => {
    expect(fieldMeta(schema, "nit").required).toBe(false);
  });

  it("treats an optional key as optional", () => {
    expect(fieldMeta(schema, "maybe")).toMatchObject({ required: false, maxLength: 5 });
  });

  it("follows dotted paths and array indexes", () => {
    expect(fieldMeta(schema, "nested.note")).toMatchObject({ required: true, minLength: 2, maxLength: 30 });
    expect(fieldMeta(schema, "rows[2].title")).toMatchObject({ required: true, maxLength: 20 });
    expect(fieldMeta(schema, "rows.0.title")).toMatchObject({ maxLength: 20 });
  });

  it("falls back to an empty, optional meta for unknown paths and unrepresentable types", () => {
    expect(fieldMeta(schema, "missing")).toEqual({ required: false });
    expect(fieldMeta(schema, "custom").required).toBe(true);
  });

  it("returns an empty meta without a schema", () => {
    expect(fieldMeta(undefined, "name")).toEqual({ required: false });
  });
});
