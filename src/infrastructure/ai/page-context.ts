import { z } from "zod";

/** Largest serialized page context the server accepts (bytes of JSON). */
export const MAX_PAGE_CONTEXT_BYTES = 20 * 1024;

const short = z.string().max(300);
const medium = z.string().max(600);

const provenanceSchema = z.object({
  source: short,
  url: z.string().max(500).optional(),
  fetchedAt: z.string().max(40).optional(),
  license: short.optional(),
});

/**
 * Compact summary of what a screen shows. Each screen registers one; the sheet assistant sends it
 * with every request. Every field is bounded so a screen can never flood the prompt.
 */
export const pageContextSchema = z.object({
  route: z.string().max(200),
  title: short,
  filters: z.record(z.string().max(60), short).optional(),
  keyNumbers: z.array(z.object({ label: short, value: short, provenance: provenanceSchema.optional() })).max(20).optional(),
  rows: z.array(z.object({ label: medium, detail: medium.optional(), provenance: provenanceSchema.optional() })).max(30).optional(),
});

export type PageContext = z.infer<typeof pageContextSchema>;

/** True when the JSON form of the context fits the size budget. */
export function fitsPageContextBudget(context: unknown): boolean {
  try {
    return new TextEncoder().encode(JSON.stringify(context)).length <= MAX_PAGE_CONTEXT_BYTES;
  } catch {
    return false;
  }
}

/** Drops trailing rows, then key numbers, until the context fits the budget. */
export function fitToBudget(context: PageContext): PageContext {
  let current = context;
  while (!fitsPageContextBudget(current) && (current.rows?.length ?? 0) > 0) {
    current = { ...current, rows: current.rows?.slice(0, -1) };
  }
  while (!fitsPageContextBudget(current) && (current.keyNumbers?.length ?? 0) > 0) {
    current = { ...current, keyNumbers: current.keyNumbers?.slice(0, -1) };
  }
  return current;
}
