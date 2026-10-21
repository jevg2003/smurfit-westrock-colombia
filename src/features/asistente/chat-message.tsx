"use client";

import type { UIMessage } from "ai";
import { CheckIcon, CopyIcon, RefreshCwIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Button } from "@/components/ui/button";
import { Message, MessageContent, MessageFooter } from "@/components/ui/message";
import type { Feedback } from "@/stores/chat.store";
import { AnswerText } from "./answer-text";
import { isToolPart, ToolTrace, type ToolPart } from "./tool-trace";

/** Set by `/api/chat` on each answer: which provider wrote it, and whether it was the backup one. */
export function usedBackupProvider(message: UIMessage): boolean {
  const metadata = message.metadata as { provider?: unknown; fallback?: unknown } | undefined;
  return metadata?.fallback === true && metadata.provider === "openrouter";
}

export const messageText = (message: UIMessage) =>
  message.parts.map((part) => (part.type === "text" ? part.text : "")).join("").trim();

interface Props {
  message: UIMessage;
  /** Only the last answer can be regenerated. */
  canRegenerate: boolean;
  /** True while this answer is still arriving. */
  streaming: boolean;
  feedback?: Feedback;
  onFeedback(value: Feedback | null): void;
  onRegenerate(): void;
}

function AssistantParts({ message }: { message: UIMessage }) {
  const blocks: ReactNode[] = [];
  let tools: ToolPart[] = [];
  const flush = () => {
    if (tools.length === 0) return;
    blocks.push(<ToolTrace key={`tools-${blocks.length}`} parts={tools} />);
    tools = [];
  };
  message.parts.forEach((part, index) => {
    if (isToolPart(part)) {
      tools.push(part);
    } else if (part.type === "text" && part.text.trim()) {
      flush();
      blocks.push(
        <Bubble key={`text-${index}`} variant="ghost">
          <BubbleContent>
            <AnswerText text={part.text} />
          </BubbleContent>
        </Bubble>,
      );
    }
  });
  flush();
  return <>{blocks}</>;
}

export function ChatMessage({ message, canRegenerate, streaming, feedback, onFeedback, onRegenerate }: Props) {
  const [copied, setCopied] = useState(false);
  const text = messageText(message);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(id);
  }, [copied]);

  if (message.role === "user") {
    return (
      <Message align="end">
        <MessageContent>
          <Bubble variant="muted">
            <BubbleContent>{text}</BubbleContent>
          </Bubble>
        </MessageContent>
      </Message>
    );
  }

  return (
    <Message>
      <MessageContent>
        <AssistantParts message={message} />
        {text && !streaming && usedBackupProvider(message) && (
          <p className="text-xs text-muted-foreground">Respondió con OpenRouter (respaldo): sin búsqueda en internet.</p>
        )}
        {text && !streaming && (
          <MessageFooter className="gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={copied ? "Respuesta copiada" : "Copiar respuesta"}
              title={copied ? "Copiada" : "Copiar"}
              onClick={() => {
                void navigator.clipboard?.writeText?.(text);
                setCopied(true);
              }}
            >
              {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
            </Button>
            {canRegenerate && (
              <Button type="button" variant="ghost" size="icon-xs" aria-label="Generar de nuevo" title="Generar de nuevo" onClick={onRegenerate}>
                <RefreshCwIcon aria-hidden="true" />
              </Button>
            )}
            <Button
              type="button"
              variant={feedback === "up" ? "secondary" : "ghost"}
              size="icon-xs"
              aria-label="Respuesta útil"
              title="Respuesta útil"
              aria-pressed={feedback === "up"}
              onClick={() => onFeedback(feedback === "up" ? null : "up")}
            >
              <ThumbsUpIcon aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant={feedback === "down" ? "secondary" : "ghost"}
              size="icon-xs"
              aria-label="Respuesta poco útil"
              title="Respuesta poco útil"
              aria-pressed={feedback === "down"}
              onClick={() => onFeedback(feedback === "down" ? null : "down")}
            >
              <ThumbsDownIcon aria-hidden="true" />
            </Button>
          </MessageFooter>
        )}
      </MessageContent>
    </Message>
  );
}
