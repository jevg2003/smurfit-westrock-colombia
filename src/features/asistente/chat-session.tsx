"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { SparklesIcon } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Marker, MarkerContent } from "@/components/ui/marker";
import { Trace, TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace";
import { useChatStore, type ChatMode } from "@/stores/chat.store";
import { describeChatFailure } from "./chat-errors";
import { ChatMessage } from "./chat-message";
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
 * conversation (`key`), starts from the saved messages and saves them again when an answer settles.
 */
export function ChatSession({ conversationId, mode, initialPrompt, onInitialPromptSent }: Props) {
  const conversation = useChatStore((state) => state.conversations.find((item) => item.id === conversationId));
  const setMessages = useChatStore((state) => state.setMessages);
  const setFeedback = useChatStore((state) => state.setFeedback);
  const getPageContext = usePageContextGetter();

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        // Read at send time: the sheet always sends what the screen shows right now.
        body: () => ({ mode, pageContext: mode === "sheet" ? (getPageContext() ?? undefined) : undefined }),
      }),
    [mode, getPageContext],
  );

  const { messages, sendMessage, status, error, regenerate, stop, clearError } = useChat({
    id: conversationId,
    messages: conversation?.messages,
    transport,
  });

  // Save once an answer settles (not on every streamed token).
  useEffect(() => {
    if (messages.length > 0 && status !== "streaming") setMessages(conversationId, messages);
  }, [messages, status, conversationId, setMessages]);

  const promptSent = useRef(false);
  useEffect(() => {
    if (!initialPrompt || promptSent.current) return;
    promptSent.current = true;
    void sendMessage({ text: initialPrompt });
    onInitialPromptSent?.();
  }, [initialPrompt, sendMessage, onInitialPromptSent]);

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
                    clearError();
                    void regenerate();
                  }}
                >
                  Reintentar
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
