import { z } from "zod";

/**
 * World Bank API v2 answers `[meta, rows]`. Names are exactly the ones returned by the API
 * (confirmed against recorded responses). `value` is null for years without data and `rows` is
 * null when the indicator has no data at all. An error is also answered with HTTP 200 and a body
 * like `[{ message: [...] }]`, which fails this schema on purpose.
 */
export const worldBankMetaSchema = z.object({
  page: z.coerce.number(),
  pages: z.coerce.number(),
  per_page: z.coerce.number(),
  total: z.coerce.number(),
  lastupdated: z.string().optional(),
});

export const worldBankRowSchema = z.object({
  indicator: z.object({ id: z.string(), value: z.string() }),
  countryiso3code: z.string(),
  date: z.string().regex(/^\d{4}$/),
  value: z.number().nullable(),
});

export const worldBankResponseSchema = z.tuple([worldBankMetaSchema, z.array(worldBankRowSchema).nullable()]);

export type WorldBankRow = z.infer<typeof worldBankRowSchema>;
