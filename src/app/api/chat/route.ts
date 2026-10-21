import { createContainer } from "@/app/composition";
import { fetchTrm } from "@/features/trm/api";
import { createFetcher } from "@/infrastructure/http/fetcher";
import { handleChat } from "@/infrastructure/ai/handle-chat";
import { resolveModel } from "@/infrastructure/ai/model";
import { createAssistantTools } from "@/infrastructure/ai/tools";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Streams the assistant answer. Keys are read from the server environment only. */
export async function POST(request: Request) {
  return handleChat(request, {
    resolve: () => resolveModel(process.env),
    tools: () => {
      const container = createContainer({ fetcher: createFetcher() });
      return createAssistantTools({
        clock: container.clock,
        fetchTrm,
        secop: container.secop,
        worldBank: container.worldBank,
        exports: container.exports,
        supersociedades: container.supersociedades,
      });
    },
  });
}
