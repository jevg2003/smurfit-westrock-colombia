import { FetchFailure, type Fetcher } from "@/infrastructure/http/fetcher";
import type { SourceFlags } from "@/infrastructure/flags";
import { MINAMBIENTE_FEED } from "../rss/feeds";
import { fetchFeed } from "../rss/fetch-feed";
import { shortHash } from "../rss/sanitize";
import { buildDecreesUrl, parseDecrees } from "./decrees";
import { isRelevantToTerms } from "./relevance";
import type { RegulationApiItem, RegulationResponse, RegulationSourceBlock, RegulationSourceId } from "./types";

const MINAMBIENTE_LIMIT = 30;
const DECREES_LIMIT = 40;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface LoadRegulationOptions {
  fetcher: Fetcher;
  now: Date;
  flags: SourceFlags;
  /** One source; absent means both. */
  source?: RegulationSourceId;
  /** Keywords that make a publication (Minambiente or decree) relevant; with no keywords everything is shown, flagged `unfiltered`, from the company profile the request handler validated. */
  terms: { include: readonly string[]; exclude: readonly string[] };
}

const disabled: RegulationSourceBlock = { status: "disabled", items: [], message: "Fuente desactivada." };

async function loadMinambiente(fetcher: Fetcher, now: Date, terms: LoadRegulationOptions["terms"]): Promise<RegulationSourceBlock> {
  const result = await fetchFeed(fetcher, MINAMBIENTE_FEED.url);
  if (!result.ok) {
    return { status: "error", items: [], ...(result.httpStatus ? { httpStatus: result.httpStatus } : {}), ...(result.message ? { message: result.message } : {}) };
  }
  const from = new Date(now);
  from.setUTCFullYear(from.getUTCFullYear() - 1);
  const items = result.items
    .filter((item) => Date.parse(item.publishedAt) >= from.getTime() && Date.parse(item.publishedAt) <= now.getTime() + DAY_MS)
    .filter((item) => isRelevantToTerms({ title: item.title }, terms))
    .map((item): RegulationApiItem => ({ id: `minambiente:${shortHash(item.url)}`, kind: "minambiente", title: item.title, url: item.url, publishedAt: item.publishedAt }))
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.id.localeCompare(b.id))
    .slice(0, MINAMBIENTE_LIMIT);
  return { status: "ok", items, httpStatus: result.httpStatus, ...(terms.include.length === 0 ? { unfiltered: true } : {}) };
}

async function loadDecrees(fetcher: Fetcher, now: Date, terms: LoadRegulationOptions["terms"]): Promise<RegulationSourceBlock> {
  let response: Response;
  try {
    response = await fetcher(buildDecreesUrl(now), { headers: { accept: "application/json" } });
  } catch (error) {
    const timedOut = error instanceof FetchFailure && error.reason === "timeout";
    return { status: "error", items: [], message: timedOut ? "Presidencia no respondió a tiempo." : "No se pudo conectar con Presidencia." };
  }
  if (!response.ok) {
    return { status: "error", items: [], httpStatus: response.status, message: `Presidencia respondió con el estado ${response.status}.` };
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { status: "error", items: [], httpStatus: response.status, message: "La respuesta de Presidencia no es JSON válido." };
  }
  const parsed = parseDecrees(body, terms, DECREES_LIMIT);
  if (!parsed.ok) return { status: "error", items: [], httpStatus: response.status, message: parsed.message };
  return { status: "ok", items: parsed.items, httpStatus: response.status, ...(terms.include.length === 0 ? { unfiltered: true } : {}) };
}

/**
 * Minambiente posts (closed feed) and Presidencia decrees (fixed dataset query), each isolated:
 * one failing source never fails the other. The client chooses no URL and no query.
 */
export async function loadRegulation({ fetcher, now, flags, source, terms }: LoadRegulationOptions): Promise<RegulationResponse> {
  const wants = (id: RegulationSourceId) => !source || source === id;
  const [minambiente, presidencia] = await Promise.all([
    wants("minambiente") ? (flags.minambiente ? loadMinambiente(fetcher, now, terms) : disabled) : disabled,
    wants("presidencia") ? (flags.presidencia ? loadDecrees(fetcher, now, terms) : disabled) : disabled,
  ]);
  return { minambiente, presidencia, fetchedAt: now.toISOString() };
}
