"use client";

import { HistoryIcon, SparklesIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { PageIntro } from "@/components/shell/page-intro";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { selectResumeList, useChatStore } from "@/stores/chat.store";
import { ChatSession } from "./chat-session";
import { Composer } from "./composer";
import { ConversationHistory } from "./conversation-history";
import { SUGGESTIONS } from "./suggestions";
import { useChatHydrated } from "./use-chat-hydration";

/** Full-page assistant. It does not see the screen: it answers from the data tools only. */
export function AssistantPage() {
  const hydrated = useChatHydrated();
  const conversations = useChatStore((state) => state.conversations);
  const activeId = useChatStore((state) => state.activeId);
  const newConversation = useChatStore((state) => state.newConversation);
  const selectConversation = useChatStore((state) => state.selectConversation);
  const deleteConversation = useChatStore((state) => state.deleteConversation);
  const renameConversation = useChatStore((state) => state.renameConversation);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pending, setPending] = useState<{ id: string; text: string } | null>(null);
  const clearPending = useCallback(() => setPending(null), []);

  const active = conversations.find((conversation) => conversation.id === activeId && conversation.mode === "page");
  const history = selectResumeList({ conversations }, "page");

  const start = (text: string) => {
    const id = newConversation("page");
    setPending({ id, text });
  };

  const historyPanel = (afterPick?: () => void) => (
    <ConversationHistory
      conversations={history}
      activeId={active?.id ?? null}
      onSelect={(id) => {
        selectConversation(id);
        afterPick?.();
      }}
      onNew={() => {
        selectConversation(null);
        afterPick?.();
      }}
      onRename={renameConversation}
      onDelete={deleteConversation}
    />
  );

  return (
    <div className="mx-auto flex min-h-[32rem] w-full max-w-5xl flex-1 flex-col gap-4">
      <PageIntro
        title="Asistente"
        description="Pregunta por la TRM, los contratos, los competidores y las señales. En esta página no ve tu pantalla."
        actions={
          <Button variant="outline" size="sm" className="md:hidden" onClick={() => setHistoryOpen(true)}>
            <HistoryIcon aria-hidden="true" data-icon="inline-start" />
            Historial
          </Button>
        }
      />

      <div className="flex min-h-0 flex-1 gap-6">
        <aside aria-label="Historial de conversaciones" className="hidden w-72 shrink-0 flex-col md:flex">
          {historyPanel()}
        </aside>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
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
              </div>
              <Composer onSubmit={start} />
            </div>
          )}
        </div>
      </div>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" className="gap-3 p-4 md:hidden">
          <SheetHeader className="p-0">
            <SheetTitle>Historial</SheetTitle>
            <SheetDescription>Tus conversaciones anteriores con el asistente.</SheetDescription>
          </SheetHeader>
          {historyOpen && historyPanel(() => setHistoryOpen(false))}
        </SheetContent>
      </Sheet>
    </div>
  );
}
