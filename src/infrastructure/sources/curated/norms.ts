import { z } from "zod";
import normasFile from "@/content/regulacion/normas.json";
import type { RegulationEntry } from "@/core/domain/regulation";
import { safeHttpUrl } from "@/lib/safe-url";

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** `url` is an http(s) link or null when no official link could be verified (never invented). */
const normSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  date: isoDay,
  topic: z.string().min(1),
  whyItMatters: z.string().min(1),
  url: z.string().refine((value) => safeHttpUrl(value) !== undefined, "Debe ser un enlace http(s)").nullable(),
  urlLabel: z.string().optional(),
  reviewedAt: isoDay,
  curated: z.literal(true),
});

export type CuratedParseResult = { ok: true; norms: RegulationEntry[] } | { ok: false; message: string };

export function parseCuratedNorms(json: unknown): CuratedParseResult {
  const parsed = z.array(normSchema).safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, message: `El archivo de normas curadas no es válido (${issue.path.join(".") || "raíz"}: ${issue.message}).` };
  }
  return {
    ok: true,
    norms: parsed.data.map(
      (norm): RegulationEntry => ({
        ...norm,
        provenance: {
          sourceId: "curated",
          url: norm.url ?? "",
          fetchedAt: `${norm.reviewedAt}T00:00:00.000Z`,
          license: "Selección y resumen propios; el texto de la norma es público",
          attribution: "Curado manualmente por el equipo del prototipo",
          curated: true,
        },
      }),
    ),
  };
}

/** The norms of `src/content/regulacion/normas.json`. Throws if the file is invalid, so a bad edit fails the build and the tests. */
export function loadCuratedNorms(): RegulationEntry[] {
  const result = parseCuratedNorms(normasFile);
  if (!result.ok) throw new Error(result.message);
  return result.norms;
}
