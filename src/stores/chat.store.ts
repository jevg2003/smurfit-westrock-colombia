import type { UIMessage } from "ai";
import { create } from "zustand";
import { persist, type StateStorage } from "zustand/middleware";
import { browserStorage } from "./browser-storage";

export const CHAT_STORAGE_KEY = "swc:chats:v1";
export const MAX_CONVERSATIONS = 30;
export const MAX_MESSAGES_PER_CONVERSATION = 100;
export const DEFAULT_CHAT_TITLE = "Conversación nueva";
const MAX_TITLE_LENGTH = 60;

export type ChatMode = "page" | "sheet";
export type Feedback = "up" | "down";

export interface Conversation {
  id: string;
  title: string;
  mode: ChatMode;
  createdAt: string;
  updatedAt: string;
  messages: UIMessage[];
  /** Thumbs given to assistant messages, by message id. Stays in this browser. */
  feedback: Record<string, Feedback>;
  /** True once the user renamed it, so the first message no longer retitles it. */
  renamed?: boolean;
}

export interface ChatState {
  conversations: Conversation[];
  /** Conversation open on the /asistente page. */
  activeId: string | null;
  /** Conversation open in the side panel. Survives navigation and reloads. */
  sheetActiveId: string | null;
  /** Whether the side panel is open. Session only: it is never saved. */
  sheetOpen: boolean;
  /** Ask the assistant to search the internet. On unless the user turns it off. */
  webSearch: boolean;
  setSheetOpen(open: boolean): void;
  selectSheetConversation(id: string | null): void;
  setWebSearch(on: boolean): void;
  /** Creates an empty conversation, makes it active and returns its id. */
  newConversation(mode: ChatMode): string;
  selectConversation(id: string | null): void;
  renameConversation(id: string, title: string): void;
  deleteConversation(id: string): void;
  setMessages(id: string, messages: UIMessage[]): void;
  setFeedback(id: string, messageId: string, value: Feedback | null): void;
}

/** Conversations latest first, optionally only one mode. Empty drafts are left out. */
export function selectResumeList(state: Pick<ChatState, "conversations">, mode?: ChatMode): Conversation[] {
  return state.conversations
    .filter((conversation) => (!mode || conversation.mode === mode) && conversation.messages.length > 0)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function titleFrom(messages: readonly UIMessage[]): string | null {
  const first = messages.find((message) => message.role === "user");
  const text = first?.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return text.length > MAX_TITLE_LENGTH ? `${text.slice(0, MAX_TITLE_LENGTH - 1)}…` : text;
}

function pruneConversations(conversations: Conversation[]): Conversation[] {
  if (conversations.length <= MAX_CONVERSATIONS) return conversations;
  const keep = new Set(
    [...conversations]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, MAX_CONVERSATIONS)
      .map((conversation) => conversation.id),
  );
  return conversations.filter((conversation) => keep.has(conversation.id));
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

function isConversation(value: unknown): value is Conversation {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    (value.mode === "page" || value.mode === "sheet") &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    Array.isArray(value.messages) &&
    value.messages.every((message) => isRecord(message) && typeof message.id === "string" && Array.isArray(message.parts)) &&
    isRecord(value.feedback)
  );
}

export interface ChatStoreOptions {
  storage?: StateStorage;
  now?: () => string;
  newId?: () => string;
}

export function createChatStore({
  storage,
  now = () => new Date().toISOString(),
  newId = () => crypto.randomUUID(),
}: ChatStoreOptions = {}) {
  const update = (conversations: Conversation[], id: string, change: (conversation: Conversation) => Conversation) =>
    conversations.map((conversation) => (conversation.id === id ? change(conversation) : conversation));

  return create<ChatState>()(
    persist(
      (set, get) => ({
        conversations: [],
        activeId: null,
        sheetActiveId: null,
        sheetOpen: false,
        webSearch: true,
        setSheetOpen: (open) => set({ sheetOpen: open }),
        selectSheetConversation: (id) => {
          if (id === null || get().conversations.some((conversation) => conversation.id === id)) set({ sheetActiveId: id });
        },
        setWebSearch: (on) => set({ webSearch: on }),
        newConversation: (mode) => {
          const id = newId();
          const stamp = now();
          const conversation: Conversation = { id, title: DEFAULT_CHAT_TITLE, mode, createdAt: stamp, updatedAt: stamp, messages: [], feedback: {} };
          set((state) => ({
            conversations: pruneConversations([conversation, ...state.conversations]),
            ...(mode === "sheet" ? { sheetActiveId: id } : { activeId: id }),
          }));
          return id;
        },
        selectConversation: (id) => {
          if (id === null || get().conversations.some((conversation) => conversation.id === id)) set({ activeId: id });
        },
        renameConversation: (id, title) => {
          const clean = title.replace(/\s+/g, " ").trim().slice(0, MAX_TITLE_LENGTH);
          if (!clean) return;
          set((state) => ({
            conversations: update(state.conversations, id, (conversation) => ({ ...conversation, title: clean, renamed: true })),
          }));
        },
        deleteConversation: (id) =>
          set((state) => ({
            conversations: state.conversations.filter((conversation) => conversation.id !== id),
            activeId: state.activeId === id ? null : state.activeId,
            sheetActiveId: state.sheetActiveId === id ? null : state.sheetActiveId,
          })),
        setMessages: (id, messages) =>
          set((state) => ({
            conversations: update(state.conversations, id, (conversation) => ({
              ...conversation,
              messages: messages.slice(-MAX_MESSAGES_PER_CONVERSATION),
              title: conversation.renamed ? conversation.title : (titleFrom(messages) ?? conversation.title),
              updatedAt: now(),
            })),
          })),
        setFeedback: (id, messageId, value) =>
          set((state) => ({
            conversations: update(state.conversations, id, (conversation) => {
              const { [messageId]: _removed, ...rest } = conversation.feedback;
              return { ...conversation, feedback: value ? { ...rest, [messageId]: value } : rest };
            }),
          })),
      }),
      {
        name: CHAT_STORAGE_KEY,
        version: 1,
        storage: browserStorage(storage),
        skipHydration: true,
        partialize: (state) => ({
          conversations: state.conversations,
          activeId: state.activeId,
          sheetActiveId: state.sheetActiveId,
          webSearch: state.webSearch,
        }),
        // Anything that does not look like a conversation is dropped, so corrupt JSON never breaks the app.
        merge: (persisted, current) => {
          const saved = isRecord(persisted) ? persisted : {};
          const conversations = Array.isArray(saved.conversations) ? saved.conversations.filter(isConversation) : [];
          const activeId =
            typeof saved.activeId === "string" && conversations.some((conversation) => conversation.id === saved.activeId)
              ? saved.activeId
              : null;
          const sheetActiveId =
            typeof saved.sheetActiveId === "string" && conversations.some((conversation) => conversation.id === saved.sheetActiveId)
              ? saved.sheetActiveId
              : null;
          const webSearch = typeof saved.webSearch === "boolean" ? saved.webSearch : true;
          return { ...current, conversations: pruneConversations(conversations), activeId, sheetActiveId, webSearch };
        },
      },
    ),
  );
}

export const useChatStore = createChatStore();
