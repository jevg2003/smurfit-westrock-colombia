import { createContainer } from "@/app/composition";
import { fetchTrm } from "@/features/trm/api";
import { readFlags } from "@/infrastructure/flags";
import { createFetcher } from "@/infrastructure/http/fetcher";
import { handleChat } from "@/infrastructure/ai/handle-chat";
import { resolveModel } from "@/infrastructure/ai/model";
import { createAssistantTools } from "@/infrastructure/ai/tools";
import { loadCuratedNorms } from "@/infrastructure/sources/curated/norms";
import { loadRegulation } from "@/infrastructure/sources/regulation/service";
import { loadNews } from "@/infrastructure/sources/rss/service";

export const runtime = "nodejs";
export const maxDuration = 60;

const FEED_TIMEOUT_MS = 12_000;

/** Streams the assistant answer. Keys are read from the server environment only. */
export async function POST(request: Request) {
  return handleChat(request, {
    resolve: () => resolveModel(process.env),
    tools: ({ thresholds }) => {
      const container = createContainer({ fetcher: createFetcher() });
      const feedFetcher = createFetcher({ timeoutMs: FEED_TIMEOUT_MS, retryDelayMs: 0 });
      return createAssistantTools({
        clock: container.clock,
        fetchTrm,
        secop: container.secop,
        worldBank: container.worldBank,
        exports: container.exports,
        supersociedades: container.supersociedades,
        xm: container.xm,
        news: (limit) => loadNews({ fetcher: feedFetcher, now: container.clock.now(), flags: readFlags(), limit }),
        regulation: () => loadRegulation({ fetcher: feedFetcher, now: container.clock.now(), flags: readFlags() }),
        curatedNorms: loadCuratedNorms,
        thresholds,
      });
    },
  });
}
