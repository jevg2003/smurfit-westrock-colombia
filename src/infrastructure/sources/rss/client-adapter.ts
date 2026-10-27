import type { NewsItem } from "@/core/domain/news";
import type { Provenance } from "@/core/domain/provenance";
import type { Result, SourceError } from "@/core/domain/result";
import type { SourceAdapter } from "@/core/ports/source-adapter";
import type { TermGroup } from "@/core/text/match";
import { FetchFailure, createFetcher, type Fetcher } from "@/infrastructure/http/fetcher";
import { safeHttpUrl } from "@/lib/safe-url";
import { newsResponseSchema } from "./schema";
import type { FeedHealth } from "./service";

export const NEWS_API_PATH = "/api/news";
const LICENSE = "Solo titular, medio, fecha y enlace (derechos del medio)";

export interface NewsQuery {
  limit?: number;
  /** Term groups of the active company: the server builds its Google News searches from them. */
  termGroups: readonly TermGroup[];
}

export interface NewsData {
  items: NewsItem[];
  feeds: FeedHealth[];
}

export interface NewsAdapterOptions {
  fetcher?: Fetcher;
}

const failure = (kind: SourceError["kind"], message: string, status?: number) =>
  ({ ok: false, error: { sourceId: "news-rss", kind, message, ...(status ? { status } : {}) } }) as const;

/**
 * Reads our own `/api/news` route (same origin, never a third-party URL). Headlines arrive without
 * matched terms: matching depends on the user's preferences and is done by the screens.
 */
export function createNewsAdapter({ fetcher = createFetcher() }: NewsAdapterOptions = {}): SourceAdapter<NewsQuery, NewsData> {
  return {
    sourceId: "news-rss",
    async fetch(query, { signal }): Promise<Result<{ data: NewsData; provenance: Provenance }>> {
      const body = JSON.stringify({ ...(query.limit ? { limit: query.limit } : {}), termGroups: query.termGroups });
      let response: Response;
      try {
        response = await fetcher(NEWS_API_PATH, { method: "POST", body, signal, headers: { accept: "application/json", "content-type": "application/json" } });
      } catch (error) {
        const reason = error instanceof FetchFailure ? error.reason : "network";
        return failure("network", reason === "timeout" ? "Las noticias no respondieron a tiempo." : "No se pudo conectar con las noticias.");
      }
      if (!response.ok) return failure("network", `Las noticias respondieron con el estado ${response.status}.`, response.status);

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        return failure("schema", "La respuesta de las noticias no es JSON válido.");
      }
      const parsed = newsResponseSchema.safeParse(payload);
      if (!parsed.success) return failure("schema", "La respuesta de las noticias cambió de forma.");

      const { items, feeds, fetchedAt } = parsed.data;
      if (feeds.length > 0 && feeds.every((feed) => feed.status === "disabled")) {
        return failure("disabled", "La fuente de noticias está desactivada.");
      }

      const news = items.flatMap((item): NewsItem[] => {
        const link = safeHttpUrl(item.url);
        if (!link) return [];
        return [
          {
            id: item.id,
            title: item.title,
            url: link,
            outlet: item.outlet,
            publishedAt: item.publishedAt,
            via: item.via,
            matchedTerms: [],
            matches: [],
            provenance: {
              sourceId: item.via === "google-news" ? "google-news" : "news-rss",
              url: link,
              fetchedAt,
              license: LICENSE,
              attribution: item.via === "google-news" ? `${item.outlet} (vía Google News)` : item.outlet,
            },
          },
        ];
      });
      if (news.length === 0 && feeds.length > 0 && feeds.every((feed) => feed.status !== "ok")) {
        return failure("network", "No se pudo leer ninguna fuente de noticias. Intenta de nuevo más tarde.");
      }
      if (news.length === 0) return failure("empty", "Las fuentes no devolvieron titulares.");

      const provenance: Provenance = {
        sourceId: "news-rss",
        url: NEWS_API_PATH,
        fetchedAt,
        license: LICENSE,
        attribution: "RSS de medios colombianos",
      };
      return { ok: true, value: { data: { items: news, feeds }, provenance } };
    },
  };
}
