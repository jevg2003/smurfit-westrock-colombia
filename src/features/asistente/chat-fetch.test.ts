import { describe, expect, it, vi } from "vitest";
import { SessionExpiredError, createChatFetch } from "./chat-fetch";

describe("createChatFetch", () => {
  it("adds X-Requested-With so Cloudflare Access answers an expired session with a 401", async () => {
    const base = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    await createChatFetch(base)("/api/chat", { method: "POST", headers: { "content-type": "application/json" } });
    const headers = new Headers(base.mock.calls[0]?.[1]?.headers);
    expect(headers.get("X-Requested-With")).toBe("XMLHttpRequest");
    expect(headers.get("content-type")).toBe("application/json");
  });

  it("returns successful and non-auth error responses untouched", async () => {
    const base = vi.fn().mockResolvedValue(new Response("{}", { status: 503 }));
    expect((await createChatFetch(base)("/api/chat")).status).toBe(503);
  });

  it.each([401, 403])("throws SessionExpiredError on a %s", async (status) => {
    const base = vi.fn().mockResolvedValue(new Response("", { status }));
    await expect(createChatFetch(base)("/api/chat")).rejects.toBeInstanceOf(SessionExpiredError);
  });
});
