import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it, vi } from "vitest";
import { handleChat, MAX_MESSAGES, type ChatDeps } from "./handle-chat";
import { MAX_PAGE_CONTEXT_BYTES } from "./page-context";

function textModel(text = "Hola") {
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "text-start", id: "t1" },
          { type: "text-delta", id: "t1", delta: text },
          { type: "text-end", id: "t1" },
          {
            type: "finish",
            finishReason: { unified: "stop", raw: undefined },
            usage: {
              inputTokens: { total: 3, noCache: 3, cacheRead: undefined, cacheWrite: undefined },
              outputTokens: { total: 5, text: 5, reasoning: undefined },
            },
          },
        ],
      }),
    }),
  });
}

const userMessage = (text: string, id = "m1") => ({ id, role: "user", parts: [{ type: "text", text }] });

const post = (body: unknown) =>
  new Request("http://localhost/api/chat", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });

function makeDeps(model = textModel()): ChatDeps & { model: MockLanguageModelV4 } {
  return {
    model,
    resolve: () => ({ ok: true, model }),
    tools: () => ({}),
  };
}

const lastPrompt = (model: MockLanguageModelV4) => JSON.stringify(model.doStreamCalls[0].prompt);

describe("handleChat", () => {
  it("streams the model answer", async () => {
    const deps = makeDeps();
    const response = await handleChat(post({ messages: [userMessage("hola")], mode: "page" }), deps);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("Hola");
  });

  it("answers 503 in Spanish when the model is not configured", async () => {
    const response = await handleChat(post({ messages: [userMessage("hola")], mode: "page" }), {
      resolve: () => ({ ok: false, message: "El asistente no está configurado: falta la clave." }),
      tools: () => ({}),
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "El asistente no está configurado: falta la clave." });
  });

  it.each([
    ["invalid JSON", "{nope"],
    ["no messages", { messages: [], mode: "page" }],
    ["unknown mode", { messages: [userMessage("x")], mode: "admin" }],
    ["malformed message", { messages: [{ role: "user" }], mode: "page" }],
  ])("answers 400 for %s", async (_name, body) => {
    const response = await handleChat(post(body), makeDeps());
    expect(response.status).toBe(400);
  });

  it("rejects an oversized page context with 413", async () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({ label: `fila ${i} ${"x".repeat(500)}`, detail: "d".repeat(500) }));
    const pageContext = { route: "/", title: "t", rows };
    expect(JSON.stringify(pageContext).length).toBeGreaterThan(MAX_PAGE_CONTEXT_BYTES);
    const response = await handleChat(post({ messages: [userMessage("x")], mode: "sheet", pageContext }), makeDeps());
    expect(response.status).toBe(413);
  });

  it("puts the page context in the prompt only in sheet mode", async () => {
    const pageContext = { route: "/contratacion", title: "Contratación visible" };

    const sheet = makeDeps();
    await (await handleChat(post({ messages: [userMessage("x")], mode: "sheet", pageContext }), sheet)).text();
    expect(lastPrompt(sheet.model)).toContain("Contratación visible");

    const page = makeDeps();
    await (await handleChat(post({ messages: [userMessage("x")], mode: "page", pageContext }), page)).text();
    expect(lastPrompt(page.model)).not.toContain("Contratación visible");
  });

  it("keeps only the latest messages, starting at a user turn", async () => {
    const messages = Array.from({ length: MAX_MESSAGES + 10 }, (_, i) =>
      i % 2 === 0 ? userMessage(`pregunta-${i}`, `u${i}`) : { id: `a${i}`, role: "assistant", parts: [{ type: "text", text: `respuesta-${i}` }] },
    );
    const deps = makeDeps();
    await (await handleChat(post({ messages, mode: "page" }), deps)).text();
    const prompt = lastPrompt(deps.model);
    expect(prompt).not.toContain("pregunta-0");
    expect(prompt).toContain(`pregunta-${MAX_MESSAGES + 8}`);
  });

  it("reports a provider failure as a stream error message in Spanish", async () => {
    const failing = new MockLanguageModelV4({
      doStream: async () => {
        throw Object.assign(new Error("rate limit"), { statusCode: 429, name: "AI_APICallError" });
      },
    });
    const response = await handleChat(post({ messages: [userMessage("x")], mode: "page" }), makeDeps(failing));
    const body = await response.text();
    expect(body).toMatch(/demasiadas|límite/i);
  });
});

describe("handleChat tools", () => {
  it("runs a read-only tool and feeds its output back as untrusted data", async () => {
    const usage = {
      inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
      outputTokens: { total: 1, text: 1, reasoning: undefined },
    };
    let call = 0;
    const model = new MockLanguageModelV4({
      doStream: async () => {
        call += 1;
        const chunks: any[] =
          call === 1
            ? [
                { type: "tool-call" as const, toolCallId: "c1", toolName: "echo", input: "{}" },
                { type: "finish" as const, finishReason: { unified: "tool-calls" as const, raw: undefined }, usage },
              ]
            : [
                { type: "text-start" as const, id: "t" },
                { type: "text-delta" as const, id: "t", delta: "listo" },
                { type: "text-end" as const, id: "t" },
                { type: "finish" as const, finishReason: { unified: "stop" as const, raw: undefined }, usage },
              ];
        return { stream: simulateReadableStream({ chunks }) };
      },
    });
    const { tool } = await import("ai");
    const { z } = await import("zod");
    const echo = tool({
      description: "echo",
      inputSchema: z.object({}),
      execute: async () => ({ note: "dato" }),
      toModelOutput: ({ output }) => ({ type: "text", value: `<<<UNTRUSTED_DATA>>>${JSON.stringify(output)}` }),
    });
    const response = await handleChat(post({ messages: [userMessage("x")], mode: "page" }), {
      resolve: () => ({ ok: true, model }),
      tools: () => ({ echo }),
    });
    const body = await response.text();
    expect(body).toContain("tool-output-available");
    expect(call).toBe(2);
    expect(JSON.stringify(model.doStreamCalls[1].prompt)).toContain("UNTRUSTED_DATA");
  });

  describe("thresholds and web search options", () => {
    const capture = () => {
      const seen: { thresholds?: unknown; webSearch?: unknown } = {};
      const model = textModel();
      const deps: ChatDeps = {
        resolve: () => ({
          ok: true,
          model,
          webSearchTools: { web_search: { type: "provider", id: "openai.web_search", args: {} } as never },
        }),
        tools: (options) => {
          seen.thresholds = options.thresholds;
          seen.webSearch = options.webSearch;
          return {};
        },
      };
      return { seen, deps, model };
    };

    it("defaults to the app thresholds with web search on", async () => {
      const { seen, deps } = capture();
      const response = await handleChat(post({ messages: [userMessage("hola")], mode: "page" }), deps);
      await response.text();
      expect(seen).toEqual({ thresholds: { watchDays: 90, alertDays: 30 }, webSearch: true });
    });

    it("passes the thresholds and the web search choice the client sends", async () => {
      const { seen, deps } = capture();
      const body = { messages: [userMessage("hola")], mode: "page", thresholds: { watchDays: 120, alertDays: 45 }, webSearch: false };
      await (await handleChat(post(body), deps)).text();
      expect(seen).toEqual({ thresholds: { watchDays: 120, alertDays: 45 }, webSearch: false });
    });

    it.each([
      ["alert above watch", { watchDays: 10, alertDays: 20 }],
      ["negative days", { watchDays: -1, alertDays: 0 }],
      ["not a number", { watchDays: "90", alertDays: 30 }],
    ])("answers 400 for thresholds with %s", async (_name, thresholds) => {
      const response = await handleChat(post({ messages: [userMessage("x")], mode: "page", thresholds }), capture().deps);
      expect(response.status).toBe(400);
    });

    it("offers the web search tool and the internet-sources rule only when it is on", async () => {
      const on = capture();
      await (await handleChat(post({ messages: [userMessage("hola")], mode: "page", webSearch: true }), on.deps)).text();
      expect(on.model.doStreamCalls[0].tools?.map((t) => t.name)).toContain("web_search");
      expect(JSON.stringify(on.model.doStreamCalls[0].prompt)).toContain("Fuentes de internet");

      const off = capture();
      await (await handleChat(post({ messages: [userMessage("hola")], mode: "page", webSearch: false }), off.deps)).text();
      expect(off.model.doStreamCalls[0].tools ?? []).toHaveLength(0);
      expect(JSON.stringify(off.model.doStreamCalls[0].prompt)).not.toContain("Fuentes de internet");
    });
  });
});

describe("handleChat provider fallback", () => {
  const apiError = (statusCode: number) => Object.assign(new Error(`status ${statusCode}`), { statusCode, name: "AI_APICallError" });
  const failing = (error: unknown) =>
    new MockLanguageModelV4({
      doStream: async () => {
        throw error;
      },
    });
  const webTool = { web_search: { type: "provider", id: "openai.web_search", args: {} } as never };
  const run = async (deps: ChatDeps, body: object = {}) => {
    const response = await handleChat(post({ messages: [userMessage("hola")], mode: "page", ...body }), deps);
    return { response, text: await response.text() };
  };
  const withFallback = (primary: MockLanguageModelV4, fallback: MockLanguageModelV4): ChatDeps => ({
    resolve: () => ({
      ok: true,
      model: primary,
      provider: "openai",
      webSearchTools: webTool,
      fallback: { model: fallback, provider: "openrouter" },
    }),
    tools: () => ({}),
  });

  it("answers with the primary and no fallback when it works", async () => {
    const primary = textModel("primario");
    const fallback = textModel("respaldo");
    const { response, text } = await run(withFallback(primary, fallback));
    expect(text).toContain("primario");
    expect(response.headers.get("x-ai-provider")).toBe("openai");
    expect(fallback.doStreamCalls).toHaveLength(0);
  });

  it.each([
    ["429 insufficient_quota", apiError(429)],
    ["401", apiError(401)],
    ["402", apiError(402)],
    ["403", apiError(403)],
    ["503", apiError(503)],
    ["a network error", new TypeError("fetch failed")],
  ])("falls back to OpenRouter on %s", async (_name, error) => {
    const fallback = textModel("respaldo");
    const { response, text } = await run(withFallback(failing(error), fallback));
    expect(text).toContain("respaldo");
    expect(response.headers.get("x-ai-provider")).toBe("openrouter");
    expect(response.headers.get("x-ai-fallback")).toBe("1");
    expect(text).toContain('"messageMetadata":{"provider":"openrouter","fallback":true}');
  });

  it("does not fall back on a 400 request error and surfaces the error", async () => {
    const fallback = textModel("respaldo");
    const { response, text } = await run(withFallback(failing(apiError(400)), fallback));
    expect(fallback.doStreamCalls).toHaveLength(0);
    expect(text).toContain('"type":"error"');
    expect(response.headers.get("x-ai-provider")).toBe("openai");
  });

  it("drops web search and says so in the prompt when the fallback answers", async () => {
    const fallback = textModel("respaldo");
    await run(withFallback(failing(apiError(429)), fallback), { webSearch: true });
    expect(fallback.doStreamCalls[0].tools ?? []).toHaveLength(0);
    const prompt = JSON.stringify(fallback.doStreamCalls[0].prompt);
    expect(prompt).toContain("no está disponible");
    expect(prompt).not.toContain("Fuentes de internet");
  });

  it("does not fall back after the model has started streaming text", async () => {
    const usage = {
      inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
      outputTokens: { total: 1, text: 1, reasoning: undefined },
    };
    const broken = new MockLanguageModelV4({
      doStream: async () => ({
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "text-start", id: "t" });
            controller.enqueue({ type: "text-delta", id: "t", delta: "parcial" });
            controller.enqueue({ type: "error", error: apiError(503) });
            controller.enqueue({ type: "finish", finishReason: { unified: "error", raw: undefined }, usage });
            controller.close();
          },
        }),
      }),
    });
    const fallback = textModel("respaldo");
    const { response, text } = await run(withFallback(broken, fallback));
    expect(fallback.doStreamCalls).toHaveLength(0);
    expect(text).toContain("parcial");
    expect(text).not.toContain("respaldo");
    expect(response.headers.get("x-ai-provider")).toBe("openai");
  });

  it("surfaces the error when the fallback fails too", async () => {
    const { text } = await run(withFallback(failing(apiError(429)), failing(apiError(401))));
    expect(text).toContain('"type":"error"');
  });

  it("reports the provider and fallback flag of a lookup that starts on the fallback", async () => {
    const model = textModel("directo");
    const { response } = await run({
      resolve: () => ({ ok: true, model, provider: "openrouter", usingFallback: true }),
      tools: () => ({}),
    });
    expect(response.headers.get("x-ai-provider")).toBe("openrouter");
    expect(response.headers.get("x-ai-fallback")).toBe("1");
  });

  it("logs one line without secrets or prompts when the fallback fires", async () => {
    const info = vi.spyOn(console, "warn").mockImplementation(() => {});
    await run(withFallback(failing(apiError(429)), textModel()));
    expect(info).toHaveBeenCalledTimes(1);
    expect(String(info.mock.calls[0][0])).toMatch(/openai.*429.*openrouter/);
    info.mockRestore();
  });
});
