"use client";

import { useChat } from "@ai-sdk/react";
import { SparklesIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Marker, MarkerContent } from "@/components/ui/marker";
import { Trace, TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace";
import { useChatStore, type ChatMode } from "@/stores/chat.store";
import { SESSION_EXPIRED_ACTION, reenterSession } from "@/components/states/session-expired";
import { describeChatFailure } from "./chat-errors";
import { ChatMessage } from "./chat-message";
import { useChatRuntime } from "./chat-runtime";
import { Composer } from "./composer";
import { usePageContextGetter } from "./page-context";

const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", timeZone: "America/Bogota" }).format(new Date(iso));

interface Props {
  conversationId: string;
  mode: ChatMode;
  /** Sent once when the session opens (a suggestion or the first question). */
  initialPrompt?: string;
  onInitialPromptSent?(): void;
}

/**
 * One conversation: the message scroller, the composer and the error state. It is remounted per
 * conversation (`key`). The `Chat` itself lives in the shared runtime, so it keeps streaming if this view goes away.
 */
export function ChatSession({ conversationId, mode, initialPrompt, onInitialPromptSent }: Props) {
  const conversation = useChatStore((state) => state.conversations.find((item) => item.id === conversationId));
  const setMessages = useChatStore((state) => state.setMessages);
  const setFeedback = useChatStore((state) => state.setFeedback);
  const getPageContext = usePageContextGetter();
  const runtime = useChatRuntime();
  runtime.bind(conversationId, { mode, getPageContext });
  const chat = runtime.get(conversationId);

  const { messages, sendMessage, status, error, regenerate, stop, clearError } = useChat({ chat });

  // Save once an answer settles (not on every streamed token), and not just for looking at a conversation.
  // The runtime also saves on finish, so an answer that ends while this view is gone is kept.
  const opened = useRef(messages);
  useEffect(() => {
    if (messages === opened.current || messages.length === 0 || status === "streaming") return;
    setMessages(conversationId, messages);
  }, [messages, status, conversationId, setMessages]);

  // Send the first prompt once. The chat is shared, so a remount (StrictMode, navigation) must not send it twice.
  const firstPrompt = useRef(initialPrompt);
  const onSent = useRef(onInitialPromptSent);
  useEffect(() => {
    const text = firstPrompt.current;
    if (!text) return;
    firstPrompt.current = undefined;
    if (chat.messages.length === 0) void chat.sendMessage({ text });
    onSent.current?.();
  }, [chat]);

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages, status, error]);

  const busy = status === "submitted" || status === "streaming";
  const failure = error ? describeChatFailure(error) : null;
  const lastAssistantId = [...messages].reverse().find((message) => message.role === "assistant")?.id;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="min-h-0 flex-1 overflow-y-auto" role="log" aria-label="Conversación con el asistente" aria-busy={busy}>
        <div className="flex flex-col gap-5 pb-2">
          {conversation && (
            <Marker variant="separator">
              <MarkerContent>{dateLabel(conversation.createdAt)}</MarkerContent>
            </Marker>
          )}
          {messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              message={message}
              streaming={status === "streaming" && index === messages.length - 1}
              canRegenerate={message.id === lastAssistantId && !busy}
              feedback={conversation?.feedback[message.id]}
              onFeedback={(value) => setFeedback(conversationId, message.id, value)}
              onRegenerate={() => void regenerate()}
            />
          ))}
          {status === "submitted" && (
            <Trace aria-label="El asistente está pensando">
              <TraceLine status="running">
                <TraceIcon>
                  <SparklesIcon />
                </TraceIcon>
                <TraceTitle>Pensando…</TraceTitle>
              </TraceLine>
            </Trace>
          )}
          {failure && (
            <Alert variant="destructive">
              <AlertTitle>{failure.title}</AlertTitle>
              <AlertDescription>{failure.message}</AlertDescription>
              <AlertAction>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => {
                    if (failure.reenter) {
                      reenterSession();
                      return;
                    }
                    clearError();
                    void regenerate();
                  }}
                >
                  {failure.reenter ? SESSION_EXPIRED_ACTION : "Reintentar"}
                </Button>
              </AlertAction>
            </Alert>
          )}
          <div ref={endRef} />
        </div>
      </div>
      <Composer busy={busy} onStop={() => void stop()} onSubmit={(text) => void sendMessage({ text })} />
    </div>
  );
}
