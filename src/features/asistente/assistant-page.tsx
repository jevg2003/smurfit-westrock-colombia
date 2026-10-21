"use client";

import { MessageSquareIcon, PlusIcon, SparklesIcon, Trash2Icon } from "lucide-react";
import { useCallback, useState } from "react";
import { PageIntro } from "@/components/shell/page-intro";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { selectResumeList, useChatStore } from "@/stores/chat.store";
import { ChatSession } from "./chat-session";
import { Composer } from "./composer";
import { SUGGESTIONS } from "./suggestions";
import { useChatHydrated } from "./use-chat-hydration";

const updatedLabel = (iso: string) =>
  new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota" }).format(
    new Date(iso),
  );

/** Full-page assistant. It does not see the screen: it answers from the data tools only. */
export function AssistantPage() {
  const hydrated = useChatHydrated();
  const conversations = useChatStore((state) => state.conversations);
  const activeId = useChatStore((state) => state.activeId);
  const newConversation = useChatStore((state) => state.newConversation);
  const selectConversation = useChatStore((state) => state.selectConversation);
  const deleteConversation = useChatStore((state) => state.deleteConversation);
  const [pending, setPending] = useState<{ id: string; text: string } | null>(null);
  const clearPending = useCallback(() => setPending(null), []);

  const active = conversations.find((conversation) => conversation.id === activeId && conversation.mode === "page");
  const resume = selectResumeList({ conversations }, "page").slice(0, 5);

  const start = (text: string) => {
    const id = newConversation("page");
    setPending({ id, text });
  };

  return (
    <div className="mx-auto flex min-h-[32rem] w-full max-w-3xl flex-1 flex-col gap-4">
      <PageIntro
        title="Asistente"
        description="Pregunta por la TRM, los contratos, los competidores y las señales. En esta página no ve tu pantalla."
        actions={
          active && (
            <Button variant="outline" size="sm" onClick={() => selectConversation(null)}>
              <PlusIcon aria-hidden="true" data-icon="inline-start" />
              Conversación nueva
            </Button>
          )
        }
      />

      {!hydrated ? (
        <Skeleton role="status" aria-label="Cargando conversaciones" className="h-64 rounded-xl" />
      ) : active ? (
        <ChatSession
          key={active.id}
          conversationId={active.id}
          mode="page"
          initialPrompt={pending?.id === active.id ? pending.text : undefined}
          onInitialPromptSent={clearPending}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto">
            <Empty className="border-0 p-6">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SparklesIcon aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>¿En qué te ayudo?</EmptyTitle>
                <EmptyDescription>Respondo con los datos públicos de la aplicación y cito la fuente de cada cifra.</EmptyDescription>
              </EmptyHeader>
            </Empty>

            <section className="flex flex-col gap-2" aria-labelledby="asistente-sugerencias">
              <h2 id="asistente-sugerencias" className="text-sm font-medium">
                Para empezar
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((suggestion) => (
                  <Button key={suggestion} variant="outline" className="h-auto justify-start py-2 text-left whitespace-normal" onClick={() => start(suggestion)}>
                    {suggestion}
                  </Button>
                ))}
              </div>
            </section>

            {resume.length > 0 && (
              <section className="flex flex-col gap-2" aria-labelledby="asistente-retomar">
                <h2 id="asistente-retomar" className="text-sm font-medium">
                  Retomar
                </h2>
                <ItemGroup>
                  {resume.map((conversation) => (
                    <Item key={conversation.id} variant="outline" size="sm">
                      <ItemMedia variant="icon">
                        <MessageSquareIcon aria-hidden="true" />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>
                          <button type="button" className="truncate text-left hover:underline" onClick={() => selectConversation(conversation.id)}>
                            {conversation.title}
                          </button>
                        </ItemTitle>
                        <ItemDescription>{updatedLabel(conversation.updatedAt)}</ItemDescription>
                      </ItemContent>
                      <ItemActions>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`Borrar la conversación: ${conversation.title}`}
                          onClick={() => deleteConversation(conversation.id)}
                        >
                          <Trash2Icon aria-hidden="true" />
                        </Button>
                      </ItemActions>
                    </Item>
                  ))}
                </ItemGroup>
              </section>
            )}
          </div>
          <Composer onSubmit={start} />
        </div>
      )}
    </div>
  );
}
