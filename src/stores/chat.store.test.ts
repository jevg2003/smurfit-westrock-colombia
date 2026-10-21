import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import {
  CHAT_STORAGE_KEY,
  DEFAULT_CHAT_TITLE,
  MAX_CONVERSATIONS,
  MAX_MESSAGES_PER_CONVERSATION,
  createChatStore,
  selectResumeList,
} from "./chat.store";
import { createMemoryStorage } from "./test-utils";

const msg = (id: string, role: UIMessage["role"], text: string): UIMessage => ({ id, role, parts: [{ type: "text", text }] });

function makeStore(storage = createMemoryStorage()) {
  let tick = 0;
  let nextId = 0;
  const store = createChatStore({
    storage,
    now: () => new Date(Date.UTC(2026, 9, 20, 12, 0, tick++)).toISOString(),
    newId: () => `c${nextId++}`,
  });
  return { store, storage };
}

describe("chat store", () => {
  it("creates a conversation, makes it active and titles it from the first user message", () => {
    const { store } = makeStore();
    const id = store.getState().newConversation("page");
    expect(store.getState().activeId).toBe(id);
    expect(store.getState().conversations[0]).toMatchObject({ id, title: DEFAULT_CHAT_TITLE, mode: "page", messages: [] });

    store.getState().setMessages(id, [msg("1", "user", "¿Qué contratos vencen pronto?"), msg("2", "assistant", "Mira esto")]);
    expect(store.getState().conversations[0].title).toBe("¿Qué contratos vencen pronto?");
  });

  it("truncates long titles and keeps a renamed title", () => {
    const { store } = makeStore();
    const id = store.getState().newConversation("sheet");
    store.getState().setMessages(id, [msg("1", "user", "x".repeat(200))]);
    expect(store.getState().conversations[0].title.length).toBeLessThanOrEqual(60);

    store.getState().renameConversation(id, "  Mi consulta  ");
    store.getState().setMessages(id, [msg("1", "user", "otra cosa")]);
    expect(store.getState().conversations[0].title).toBe("Mi consulta");
  });

  it("lists conversations latest first (Resume list), optionally by mode", () => {
    const { store } = makeStore();
    const a = store.getState().newConversation("page");
    const b = store.getState().newConversation("sheet");
    store.getState().setMessages(b, [msg("2", "user", "b")]);
    store.getState().setMessages(a, [msg("1", "user", "a")]);
    expect(selectResumeList(store.getState()).map((c) => c.id)).toEqual([a, b]);
    expect(selectResumeList(store.getState(), "sheet").map((c) => c.id)).toEqual([b]);
  });

  it("selects, renames and deletes", () => {
    const { store } = makeStore();
    const a = store.getState().newConversation("page");
    const b = store.getState().newConversation("page");
    store.getState().selectConversation(a);
    expect(store.getState().activeId).toBe(a);
    store.getState().selectConversation("missing");
    expect(store.getState().activeId).toBe(a);

    store.getState().deleteConversation(a);
    expect(store.getState().conversations.map((c) => c.id)).toEqual([b]);
    expect(store.getState().activeId).toBeNull();
  });

  it("caps conversations (dropping the oldest) and messages per conversation", () => {
    const { store } = makeStore();
    const first = store.getState().newConversation("page");
    for (let i = 0; i < MAX_CONVERSATIONS; i++) store.getState().newConversation("page");
    expect(store.getState().conversations).toHaveLength(MAX_CONVERSATIONS);
    expect(store.getState().conversations.some((c) => c.id === first)).toBe(false);

    const id = store.getState().newConversation("page");
    const many = Array.from({ length: MAX_MESSAGES_PER_CONVERSATION + 20 }, (_, i) => msg(`m${i}`, i % 2 ? "assistant" : "user", `t${i}`));
    store.getState().setMessages(id, many);
    const kept = store.getState().conversations.find((c) => c.id === id)!.messages;
    expect(kept).toHaveLength(MAX_MESSAGES_PER_CONVERSATION);
    expect(kept.at(-1)?.id).toBe(`m${MAX_MESSAGES_PER_CONVERSATION + 19}`);
  });

  it("stores thumbs feedback per message and clears it", () => {
    const { store } = makeStore();
    const id = store.getState().newConversation("page");
    store.getState().setFeedback(id, "m2", "up");
    expect(store.getState().conversations[0].feedback).toEqual({ m2: "up" });
    store.getState().setFeedback(id, "m2", null);
    expect(store.getState().conversations[0].feedback).toEqual({});
  });

  it("persists under swc:chats:v1 and rehydrates", async () => {
    const { store, storage } = makeStore();
    const id = store.getState().newConversation("page");
    store.getState().setMessages(id, [msg("1", "user", "hola")]);
    expect(storage.getItem(CHAT_STORAGE_KEY)).toContain("hola");
    expect(CHAT_STORAGE_KEY).toBe("swc:chats:v1");

    const fresh = createChatStore({ storage });
    await fresh.persist.rehydrate();
    expect(fresh.getState().conversations[0].messages).toHaveLength(1);
  });

  it("discards corrupt persisted data instead of crashing", async () => {
    const storage = createMemoryStorage();
    storage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ state: { conversations: [{ id: 1, messages: "nope" }, null] }, version: 1 }));
    const store = createChatStore({ storage });
    await store.persist.rehydrate();
    expect(store.getState().conversations).toEqual([]);
  });

  describe("assistant sheet state", () => {
    it("keeps the sheet conversation apart from the page one and does not persist the open state", async () => {
      const { store, storage } = makeStore();
      const page = store.getState().newConversation("page");
      const sheet = store.getState().newConversation("sheet");
      expect(store.getState().activeId).toBe(page);
      expect(store.getState().sheetActiveId).toBe(sheet);

      store.getState().setSheetOpen(true);
      expect(store.getState().sheetOpen).toBe(true);

      const { store: reloaded } = makeStore(storage);
      await reloaded.persist.rehydrate();
      expect(reloaded.getState().sheetActiveId).toBe(sheet);
      expect(reloaded.getState().sheetOpen).toBe(false);
    });

    it("selects a sheet conversation, ignores unknown ids and clears it when deleted", () => {
      const { store } = makeStore();
      const a = store.getState().newConversation("sheet");
      const b = store.getState().newConversation("sheet");
      store.getState().selectSheetConversation(a);
      expect(store.getState().sheetActiveId).toBe(a);
      store.getState().selectSheetConversation("nope");
      expect(store.getState().sheetActiveId).toBe(a);
      store.getState().deleteConversation(a);
      expect(store.getState().sheetActiveId).toBeNull();
      store.getState().selectSheetConversation(null);
      expect(store.getState().sheetActiveId).toBeNull();
      expect(b).not.toBe(a);
    });

    it("keeps web search on by default and remembers the choice", async () => {
      const { store, storage } = makeStore();
      expect(store.getState().webSearch).toBe(true);
      store.getState().setWebSearch(false);
      const { store: reloaded } = makeStore(storage);
      await reloaded.persist.rehydrate();
      expect(reloaded.getState().webSearch).toBe(false);
    });
  });
});
