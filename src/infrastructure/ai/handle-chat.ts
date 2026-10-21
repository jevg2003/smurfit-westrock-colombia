import {
  APICallError,
  convertToModelMessages,
  stepCountIs,
  streamText,
  type LanguageModel,
  type ToolSet,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { fitsPageContextBudget, pageContextSchema } from "./page-context";
import { buildSystemPrompt } from "./system-prompt";

/** Messages sent to the model: older turns are dropped. */
export const MAX_MESSAGES = 40;
/** Tool-call rounds per answer. */
export const MAX_STEPS = 6;
/** Whole request body budget (bytes). */
export const MAX_BODY_BYTES = 400 * 1024;
const MAX_OUTPUT_TOKENS = 1500;

const messageSchema = z.object({
  id: z.string().max(100),
  role: z.enum(["user", "assistant"]),
  parts: z.array(z.object({ type: z.string().max(100) }).loose()).max(60),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(200),
  mode: z.enum(["page", "sheet"]),
  pageContext: z.unknown().optional(),
});

export type ModelLookup = { ok: true; model: LanguageModel } | { ok: false; message: string };

export interface ChatDeps {
  resolve(): ModelLookup;
  tools(): ToolSet;
}

const json = (status: number, error: string) => Response.json({ error }, { status });

const RATE_LIMIT_MESSAGE = "Hay demasiadas consultas en este momento. Espera un poco y vuelve a intentarlo.";
const GENERIC_MESSAGE = "No pude responder en este momento. Vuelve a intentarlo.";

/** Short Spanish text for the user; never includes provider details or keys. */
export function describeChatError(error: unknown): string {
  if (APICallError.isInstance(error) && error.statusCode === 429) return RATE_LIMIT_MESSAGE;
  const status = (error as { statusCode?: unknown } | null)?.statusCode;
  if (status === 429) return RATE_LIMIT_MESSAGE;
  if (status === 401 || status === 403) return "El proveedor de IA rechazó la clave configurada en el servidor.";
  return GENERIC_MESSAGE;
}

/** POST /api/chat: validates the request, then streams the answer with read-only tools. */
export async function handleChat(request: Request, deps: ChatDeps): Promise<Response> {
  const lookup = deps.resolve();
  if (!lookup.ok) return json(503, lookup.message);

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return json(413, "La solicitud es demasiado grande.");

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, "La solicitud no es válida.");
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return json(400, "La solicitud no es válida.");
  const { messages, mode, pageContext: rawContext } = parsed.data;

  let pageContext;
  if (rawContext !== undefined && mode === "sheet") {
    if (!fitsPageContextBudget(rawContext)) return json(413, "El contexto de la pantalla es demasiado grande.");
    const context = pageContextSchema.safeParse(rawContext);
    if (!context.success) return json(400, "El contexto de la pantalla no es válido.");
    pageContext = context.data;
  }

  let recent = messages.slice(-MAX_MESSAGES);
  while (recent.length > 0 && recent[0].role !== "user") recent = recent.slice(1);
  if (recent.length === 0) return json(400, "La solicitud no es válida.");

  const tools = deps.tools();
  const result = streamText({
    model: lookup.model,
    instructions: buildSystemPrompt({ mode, pageContext }),
    messages: await convertToModelMessages(recent as unknown as UIMessage[], { tools }),
    tools,
    stopWhen: stepCountIs(MAX_STEPS),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    abortSignal: request.signal,
  });

  return result.toUIMessageStreamResponse({ onError: describeChatError });
}
