import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
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
});
