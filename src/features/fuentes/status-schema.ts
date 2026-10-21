import { z } from "zod";

/** Shape of `GET /api/fuentes`: booleans and the provider name only. */
export const fuentesStatusSchema = z.object({
  flags: z.object({
    newsRss: z.boolean(),
    googleNews: z.boolean(),
    minambiente: z.boolean(),
    presidencia: z.boolean(),
  }),
  ai: z.object({ configured: z.boolean(), provider: z.string(), webSearch: z.boolean() }),
});

export type FuentesStatus = z.infer<typeof fuentesStatusSchema>;
