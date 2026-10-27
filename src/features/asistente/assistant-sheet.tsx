"use client";

import { ChevronDownIcon, ExpandIcon, HistoryIcon, PlusIcon, SparklesIcon, Trash2Icon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Marker, MarkerContent } from "@/components/ui/marker";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { selectResumeList, useChatStore } from "@/stores/chat.store";
import { useChatRuntime } from "./chat-runtime";
import { ChatSession } from "./chat-session";
import { Composer } from "./composer";
import { useCurrentPageContext } from "./page-context";
import { relativeTime } from "@/lib/relative-time";
import { useChatHydrated } from "./use-chat-hydration";

const MAX_HISTORY = 10;

/** The conversation shown in the panel: the saved choice, else the latest one. */
function useSheetConversation() {
  const conversations = useChatStore((state) => state.conversations);
  const sheetActiveId = useChatStore((state) => state.sheetActiveId);
  const history = selectResumeList({ conversations }, "sheet");
  const wanted = sheetActiveId ?? history[0]?.id;
  const active = conversations.find((conversation) => conversation.id === wanted && conversation.mode === "sheet");
  return { history, active };
}

function HistoryMenu() {
  const router = useRouter();
  const runtime = useChatRuntime();
  const { history, active } = useSheetConversation();
  const newConversation = useChatStore((state) => state.newConversation);
  const selectSheetConversation = useChatStore((state) => state.selectSheetConversation);
  const deleteConversation = useChatStore((state) => state.deleteConversation);
  const setSheetOpen = useChatStore((state) => state.setSheetOpen);
  const hasMessages = (active?.messages.length ?? 0) > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="min-w-0 max-w-56" />}>
        <HistoryIcon aria-hidden="true" data-icon="inline-start" />
        <span className="truncate">Historial</span>
        <ChevronDownIcon aria-hidden="true" data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuItem onClick={() => (hasMessages || !active ? newConversation("sheet") : undefined)}>
          <PlusIcon aria-hidden="true" />
          Nueva conversación
        </DropdownMenuItem>
        {history.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Conversaciones anteriores</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={active?.id ?? ""} onValueChange={(id) => selectSheetConversation(id)}>
                {history.slice(0, MAX_HISTORY).map((conversation) => (
                  <DropdownMenuRadioItem key={conversation.id} value={conversation.id}>
                    <span className="min-w-0 flex-1 truncate">{conversation.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(conversation.updatedAt)}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </>
        )}
        {hasMessages && active && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setSheetOpen(false);
                router.push(`/asistente?c=${encodeURIComponent(active.id)}`);
              }}
            >
              <ExpandIcon aria-hidden="true" />
              Abrir en página completa
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => {
                runtime.discard(active.id);
                deleteConversation(active.id);
              }}
            >
              <Trash2Icon aria-hidden="true" />
              Eliminar conversación
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SheetBody() {
  const hydrated = useChatHydrated();
  const pageContext = useCurrentPageContext();
  const { active } = useSheetConversation();
  const newConversation = useChatStore((state) => state.newConversation);
  const [pending, setPending] = useState<{ id: string; text: string } | null>(null);

  const start = (text: string) => {
    const id = active && active.messages.length === 0 ? active.id : newConversation("sheet");
    setPending({ id, text });
  };

  if (!hydrated) return <Skeleton role="status" aria-label="Cargando conversaciones" className="mx-4 h-48 rounded-xl" />;

  const showChat = active && (active.messages.length > 0 || pending?.id === active.id);

  return (
    <>
      <div className="px-4">
        <Marker variant="border" className="min-w-0">
          <MarkerContent className="truncate">{pageContext ? `Viendo: ${pageContext.title}` : "No veo datos de esta pantalla."}</MarkerContent>
        </Marker>
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
        {showChat ? (
          <ChatSession
            key={active.id}
            conversationId={active.id}
            mode="sheet"
            // Only sent while the chat is still empty, so a stale prompt can never be sent twice.
            initialPrompt={pending?.id === active.id ? pending.text : undefined}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col justify-between gap-4">
            <p className="max-w-prose text-sm text-muted-foreground">
              Pregúntame por lo que ves en esta pantalla. También puedo consultar la TRM, los contratos, los competidores y los avisos.
            </p>
            <Composer onSubmit={start} placeholder="Pregunta sobre esta pantalla" />
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Button in the header that opens the assistant on any screen. The assistant sees the current screen.
 * Whether it is open lives in the chat store, so it stays open when the user changes screen.
 */
export function AssistantSheet() {
  const open = useChatStore((state) => state.sheetOpen);
  const setOpen = useChatStore((state) => state.setSheetOpen);

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
              <div className="flex min-w-0 items-center gap-1">
                {open && <HistoryMenu />}
                <SheetClose render={<Button variant="ghost" size="icon-sm" aria-label="Cerrar el asistente" />}>
                  <XIcon aria-hidden="true" />
                </SheetClose>
              </div>
            </div>
            <SheetDescription>Ve lo que estás mirando y puede consultar los datos de la aplicación.</SheetDescription>
          </SheetHeader>
          {open && <SheetBody />}
        </SheetContent>
      </Sheet>
    </>
  );
}
