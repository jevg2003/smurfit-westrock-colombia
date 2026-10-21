import {
  AISDKError,
  APICallError,
  RetryError,
  convertToModelMessages,
  stepCountIs,
  streamText,
  type LanguageModel,
  type ToolSet,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { DEFAULT_THRESHOLDS } from "@/content/config/empresa";
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

const MAX_WINDOW_DAYS = 730;
const thresholdsSchema = z
  .object({
    watchDays: z.number().int().min(0).max(MAX_WINDOW_DAYS),
    alertDays: z.number().int().min(0).max(MAX_WINDOW_DAYS),
  })
  .refine((value) => value.alertDays <= value.watchDays);

const DEFAULT_WINDOWS = {
  watchDays: DEFAULT_THRESHOLDS.contractExpiryWatchDays,
  alertDays: DEFAULT_THRESHOLDS.contractExpiryAlertDays,
};

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(200),
  mode: z.enum(["page", "sheet"]),
  pageContext: z.unknown().optional(),
  /** The user's contract-expiry windows from Preferencias. */
  thresholds: thresholdsSchema.default(DEFAULT_WINDOWS),
  /** Web search is on unless the user turns it off in the composer. */
  webSearch: z.boolean().default(true),
});

export interface ChatToolOptions {
  thresholds: { watchDays: number; alertDays: number };
  webSearch: boolean;
}

export type ProviderName = "openai" | "openrouter";

export interface ChatModel {
  model: LanguageModel;
  provider?: ProviderName;
  webSearchTools?: ToolSet;
}

export type ModelLookup =
  | (ChatModel & {
      ok: true;
      /** Tried when the primary fails before streaming anything, for a reason that means it is unavailable. */
      fallback?: ChatModel;
      /** The primary key is missing, so the answering provider is already the fallback. */
      usingFallback?: boolean;
    })
  | { ok: false; message: string };

export interface ChatDeps {
  resolve(): ModelLookup;
  tools(options: ChatToolOptions): ToolSet;
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

const FALLBACK_STATUSES = new Set([401, 402, 403, 429]);

function statusOf(error: unknown): number | undefined {
  const status = (error as { statusCode?: unknown } | null)?.statusCode;
  return typeof status === "number" ? status : undefined;
}

/**
 * True when the failure means the provider is unavailable (bad or exhausted key, rate limit, server or
 * network trouble). Other 4xx errors are request problems that would fail the same way elsewhere.
 */
export function shouldFallBack(error: unknown): boolean {
  const cause = RetryError.isInstance(error) ? error.lastError : error;
  const status = statusOf(cause);
  if (status !== undefined) return FALLBACK_STATUSES.has(status) || status >= 500;
  // No HTTP status: network errors and timeouts. Other SDK errors (bad prompt, no such tool) are not provider outages.
  return !AISDKError.isInstance(cause) || APICallError.isInstance(cause);
}

interface OpenedStream {
  result: ReturnType<typeof streamText>;
  /** Set when the stream failed before producing any output. */
  error?: unknown;
}

/** Starts a stream and waits for its first real part, so a failure before any output can still be retried elsewhere. */
async function openStream(options: Parameters<typeof streamText>[0]): Promise<OpenedStream> {
  const result = streamText(options);
  const reader = result.fullStream.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return { result };
      if (value.type === "start" || value.type === "start-step") continue;
      return value.type === "error" ? { result, error: value.error } : { result };
    }
  } finally {
    // Only this peeking branch is cancelled; the response reads its own branch of the same stream.
    void reader.cancel().catch(() => undefined);
  }
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
  const { messages, mode, pageContext: rawContext, thresholds, webSearch } = parsed.data;

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

  const attempt = (candidate: ChatModel, willFallBack: boolean) => {
    const webTools = webSearch ? (candidate.webSearchTools ?? {}) : {};
    const hasWeb = Object.keys(webTools).length > 0;
    const tools: ToolSet = { ...deps.tools({ thresholds, webSearch }), ...webTools };
    return convertToModelMessages(recent as unknown as UIMessage[], { tools }).then((modelMessages) =>
      openStream({
        model: candidate.model,
        instructions: buildSystemPrompt({ mode, pageContext, webSearch: hasWeb, webSearchUnavailable: webSearch && !hasWeb }),
        messages: modelMessages,
        tools,
        stopWhen: stepCountIs(MAX_STEPS),
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        abortSignal: request.signal,
        // With a fallback ready, fail fast instead of retrying the same provider with backoff.
        ...(willFallBack ? { maxRetries: 0 } : {}),
      }),
    );
  };

  const respond = ({ result }: OpenedStream, candidate: ChatModel, fallbackUsed: boolean) => {
    const headers: Record<string, string> = {};
    if (candidate.provider) headers["x-ai-provider"] = candidate.provider;
    if (fallbackUsed) headers["x-ai-fallback"] = "1";
    return result.toUIMessageStreamResponse({
      onError: describeChatError,
      headers,
      // Lets the UI tell which provider wrote each answer, so it can say when web search was not available.
      messageMetadata: ({ part }) => (part.type === "start" && candidate.provider ? { provider: candidate.provider, fallback: fallbackUsed } : undefined),
    });
  };

  const fallback = lookup.fallback;
  const first = await attempt(lookup, fallback !== undefined);
  if (!fallback || first.error === undefined || request.signal.aborted || !shouldFallBack(first.error)) {
    return respond(first, lookup, lookup.usingFallback === true);
  }

  // Logs the provider names and the HTTP status only: never keys, prompts or provider messages.
  console.warn(`[ai] ${lookup.provider ?? "primary"} unavailable (status ${statusOf(first.error) ?? "none"}); answering with ${fallback.provider ?? "fallback"}`);
  return respond(await attempt(fallback, false), fallback, true);
}
