import { z } from "zod";
import { regulationKeywordOf, type RegulationTopicTerms } from "@/core/rules/regulation-keyword-mention";
import { floatingToBogotaIso } from "@/core/time/bogota";
import { canonicalUrl, shortHash, toPlainText } from "../rss/sanitize";
import { DECREES_DATASET_URL, type RegulationApiItem } from "./types";

/** Rows read per request. The keyword filter is applied to these rows, so it is bounded. */
const ROW_LIMIT = 500;

/**
 * Exact filters only (no LIKE): decrees of the last 12 months, newest first. Fields confirmed live:
 * `titulo`, `descripcion`, `tipo`, `fecha` (floating timestamp) and `url`.
 */
export function buildDecreesUrl(now: Date): string {
  const from = new Date(now);
  from.setUTCFullYear(from.getUTCFullYear() - 1);
  const since = `${from.toISOString().slice(0, 10)}T00:00:00.000`;
  const where = `tipo='DECRETOS' AND fecha>'${since}'`;
  const params = [
    `$select=${encodeURIComponent("titulo,descripcion,tipo,fecha,url")}`,
    `$where=${encodeURIComponent(where)}`,
    `$order=${encodeURIComponent("fecha DESC")}`,
    `$limit=${ROW_LIMIT}`,
  ];
  return `${DECREES_DATASET_URL}?${params.join("&")}`;
}

const decreeRowSchema = z.object({
  titulo: z.string().min(1),
  descripcion: z.string().optional(),
  tipo: z.string(),
  fecha: z.string().min(1),
  url: z.string(),
});

export type DecreesParseResult = { ok: true; items: RegulationApiItem[] } | { ok: false; message: string };

/**
 * Decrees that mention a regulation or sustainability keyword (and no excluded term), newest first,
 * at most `limit`. Rows with a link that is not http(s) or an unreadable date are dropped.
 */
export function parseDecrees(json: unknown, terms: RegulationTopicTerms, limit: number): DecreesParseResult {
  const parsed = z.array(decreeRowSchema).safeParse(json);
  if (!parsed.success) return { ok: false, message: "La respuesta de Presidencia cambió de forma." };

  const items = parsed.data.flatMap((row): RegulationApiItem[] => {
    const url = canonicalUrl(row.url);
    const iso = floatingToBogotaIso(row.fecha);
    const title = toPlainText(row.titulo);
    if (!url || !iso || !title) return [];
    const summary = toPlainText(row.descripcion ?? "", 400).replace(/^["“]+|["”]+$/g, "").trim();
    if (!regulationKeywordOf({ title, summary }, terms)) return [];
    return [
      {
        id: `decree:${shortHash(title)}`,
        kind: "decree",
        title,
        ...(summary ? { summary } : {}),
        url,
        publishedAt: new Date(iso).toISOString(),
      },
    ];
  });

  const sorted = items.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.id.localeCompare(b.id));
  const seen = new Set<string>();
  const unique = sorted.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
  return { ok: true, items: unique.slice(0, limit) };
}
