import { FetchFailure, type Fetcher } from "@/infrastructure/http/fetcher";
import { parseFeed, type HeadlineWithSource } from "./parse";

/** Feed bodies above this size are refused (the biggest recorded one is about 500 KB). */
const MAX_BODY_CHARS = 2_500_000;

export interface FeedFetchResult {
  ok: boolean;
  items: HeadlineWithSource[];
  httpStatus?: number;
  message?: string;
}

/** Fetches and parses one feed. Never throws: a failure becomes `{ ok: false, message }`. */
export async function fetchFeed(fetcher: Fetcher, url: string): Promise<FeedFetchResult> {
  let response: Response;
  try {
    response = await fetcher(url, { headers: { accept: "application/rss+xml, application/xml, text/xml;q=0.9" } });
  } catch (error) {
    const timedOut = error instanceof FetchFailure && error.reason === "timeout";
    return { ok: false, items: [], message: timedOut ? "La fuente no respondió a tiempo." : "No se pudo conectar con la fuente." };
  }
  if (!response.ok) {
    return { ok: false, items: [], httpStatus: response.status, message: `La fuente respondió con el estado ${response.status}.` };
  }
  let text: string;
  try {
    text = await response.text();
  } catch {
    return { ok: false, items: [], httpStatus: response.status, message: "No se pudo leer la respuesta de la fuente." };
  }
  if (text.length > MAX_BODY_CHARS) {
    return { ok: false, items: [], httpStatus: response.status, message: "La respuesta de la fuente es demasiado grande." };
  }
  const items = parseFeed(text);
  if (items.length === 0) {
    return { ok: false, items: [], httpStatus: response.status, message: "La fuente no devolvió titulares con el formato esperado." };
  }
  return { ok: true, items, httpStatus: response.status };
}
