"use client";

import { Chat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { createContext, useContext, useState, type ReactNode } from "react";
import type { PageContext } from "@/infrastructure/ai/page-context";
import { useChatStore, type ChatMode } from "@/stores/chat.store";
import { usePreferencesStore } from "@/stores/preferences.store";
import { createChatFetch } from "./chat-fetch";

/** What the screen currently showing a conversation tells the runtime at send time. */
export interface ChatBinding {
  mode: ChatMode;
  getPageContext(): PageContext | null;
}

export interface ChatRuntime {
  /** One shared `Chat` per conversation id: it keeps streaming while the user changes route. */
  get(id: string): Chat<UIMessage>;
  /** The mounted view sets how the next message is sent (page or side panel). */
  bind(id: string, binding: ChatBinding): void;
  /** Stops and forgets the chat of a deleted conversation. */
  discard(id: string): void;
}

const API = "/api/chat";
const chatFetch = createChatFetch();

/**
 * Holds the AI SDK `Chat` objects above the routes. The saved conversation in `chat.store` is the
 * source of truth: a chat starts from it and writes back when an answer finishes.
 */
export function createChatRuntime(): ChatRuntime {
  const chats = new Map<string, Chat<UIMessage>>();
  const bindings = new Map<string, ChatBinding>();

  const create = (id: string) => {
    const saved = useChatStore.getState().conversations.find((conversation) => conversation.id === id);
    const save = (messages: UIMessage[]) => {
      if (messages.length > 0) useChatStore.getState().setMessages(id, messages);
    };
    return new Chat<UIMessage>({
      id,
      messages: saved?.messages ?? [],
      transport: new DefaultChatTransport({
        api: API,
        fetch: chatFetch,
        // Read at send time, so the latest preferences and the current screen are always used.
        body: () => {
          const binding = bindings.get(id);
          const mode = binding?.mode ?? "page";
          const { thresholds } = usePreferencesStore.getState();
          return {
            mode,
            pageContext: mode === "sheet" ? (binding?.getPageContext() ?? undefined) : undefined,
            thresholds: { watchDays: thresholds.contractExpiryWatchDays, alertDays: thresholds.contractExpiryAlertDays },
            webSearch: useChatStore.getState().webSearch,
          };
        },
      }),
      onFinish: ({ messages }) => save(messages),
      onError: () => save(chats.get(id)?.messages ?? []),
    });
  };

  return {
    get(id) {
      let chat = chats.get(id);
      if (!chat) {
        chat = create(id);
        chats.set(id, chat);
      }
      return chat;
    },
    bind: (id, binding) => void bindings.set(id, binding),
    discard(id) {
      void chats.get(id)?.stop();
      chats.delete(id);
      bindings.delete(id);
    },
  };
}

const RuntimeContext = createContext<ChatRuntime | null>(null);

/** Mounted once in `providers.tsx`, so conversations outlive any single screen. */
export function ChatRuntimeProvider({ children }: { children: ReactNode }) {
  const [runtime] = useState(createChatRuntime);
  return <RuntimeContext.Provider value={runtime}>{children}</RuntimeContext.Provider>;
}

/** The shared runtime. Outside a provider (isolated renders and tests) a private one is created. */
export function useChatRuntime(): ChatRuntime {
  const shared = useContext(RuntimeContext);
  const [fallback] = useState(() => (shared ? null : createChatRuntime()));
  return shared ?? (fallback as ChatRuntime);
}
