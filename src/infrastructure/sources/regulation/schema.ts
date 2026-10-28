import { z } from "zod";

const itemSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["minambiente", "decree"]),
  title: z.string().min(1),
  summary: z.string().optional(),
  url: z.string().min(1),
  publishedAt: z.iso.datetime(),
});

const blockSchema = z.object({
  status: z.enum(["ok", "error", "disabled"]),
  items: z.array(itemSchema),
  httpStatus: z.number().int().optional(),
  message: z.string().optional(),
  unfiltered: z.boolean().optional(),
});

/** What `/api/regulacion` answers. Validated again in the browser. */
export const regulationResponseSchema = z.object({
  minambiente: blockSchema,
  presidencia: blockSchema,
  fetchedAt: z.iso.datetime(),
});
