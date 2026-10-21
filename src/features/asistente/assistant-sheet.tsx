"use client";

import { PlusIcon, SparklesIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Marker, MarkerContent } from "@/components/ui/marker";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { selectResumeList, useChatStore } from "@/stores/chat.store";
import { ChatSession } from "./chat-session";
import { Composer } from "./composer";
import { useCurrentPageContext } from "./page-context";
import { useChatHydrated } from "./use-chat-hydration";

function SheetBody() {
  const hydrated = useChatHydrated();
  const pageContext = useCurrentPageContext();
  const conversations = useChatStore((state) => state.conversations);
  const newConversation = useChatStore((state) => state.newConversation);
  // The sheet keeps its own current conversation. `undefined` resumes the latest one, `null` is a blank start.
  const [currentId, setCurrentId] = useState<string | null | undefined>(undefined);
  const [pending, setPending] = useState<{ id: string; text: string } | null>(null);

  const latest = selectResumeList({ conversations }, "sheet")[0]?.id ?? null;
  const activeId = currentId === undefined ? latest : currentId;
  const active = conversations.find((conversation) => conversation.id === activeId && conversation.mode === "sheet");

  const start = (text: string) => {
    const id = newConversation("sheet");
    setCurrentId(id);
    setPending({ id, text });
  };

  if (!hydrated) return <Skeleton role="status" aria-label="Cargando conversaciones" className="mx-4 h-48 rounded-xl" />;

  return (
    <>
      <div className="flex items-center gap-2 px-4">
        <Marker variant="border" className="min-w-0 flex-1">
          <MarkerContent className="truncate">
            {pageContext ? `Viendo: ${pageContext.title}` : "No veo datos de esta pantalla."}
          </MarkerContent>
        </Marker>
        {active && (
          <Button variant="outline" size="xs" onClick={() => setCurrentId(null)}>
            <PlusIcon aria-hidden="true" data-icon="inline-start" />
            Nueva
          </Button>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
        {active ? (
          <ChatSession
            key={active.id}
            conversationId={active.id}
            mode="sheet"
            initialPrompt={pending?.id === active.id ? pending.text : undefined}
            onInitialPromptSent={() => setPending(null)}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col justify-between gap-4">
            <p className="max-w-prose text-sm text-muted-foreground">
              Pregúntame por lo que ves en esta pantalla. También puedo consultar la TRM, los contratos, los competidores y las señales.
            </p>
            <Composer onSubmit={start} placeholder="Pregunta sobre esta pantalla" />
          </div>
        )}
      </div>
    </>
  );
}

/** Button in the header that opens the assistant on any screen. The assistant sees the current screen. */
export function AssistantSheet() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <SparklesIcon aria-hidden="true" data-icon="inline-start" />
        <span className="max-sm:sr-only">Asistente</span>
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent showCloseButton={false} className="gap-3 data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
          <SheetHeader>
            <div className="flex items-center justify-between gap-2">
              <SheetTitle>Asistente</SheetTitle>
              <SheetClose render={<Button variant="ghost" size="icon-sm" aria-label="Cerrar el asistente" />}>
                <XIcon aria-hidden="true" />
              </SheetClose>
            </div>
            <SheetDescription>Ve lo que estás mirando y puede consultar los datos de la aplicación.</SheetDescription>
          </SheetHeader>
          {open && <SheetBody />}
        </SheetContent>
      </Sheet>
    </>
  );
}
