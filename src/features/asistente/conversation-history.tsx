"use client";

import { MessageSquareIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import type { Conversation } from "@/stores/chat.store";
import { relativeTime } from "@/lib/relative-time";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect(id: string): void;
  onNew(): void;
  onRename(id: string, title: string): void;
  onDelete(id: string): void;
  /** Injected for tests. */
  now?: Date;
}

/** Previous conversations, latest first, with select, rename, delete (confirmed) and a new-conversation button. */
export function ConversationHistory({ conversations, activeId, onSelect, onNew, onRename, onDelete, now }: Props) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const sorted = [...conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const commitRename = (id: string) => {
    if (draft.trim()) onRename(id, draft);
    setRenamingId(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Button variant="outline" size="sm" onClick={onNew}>
        <PlusIcon aria-hidden="true" data-icon="inline-start" />
        Nueva conversación
      </Button>

      {sorted.length === 0 ? (
        <Empty className="border-0 p-4">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquareIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Aún no hay conversaciones</EmptyTitle>
            <EmptyDescription>Cuando haga una pregunta, quedará guardada aquí.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ItemGroup className="min-h-0 flex-1 gap-1 overflow-y-auto">
          {sorted.map((conversation) => (
            <Item key={conversation.id} size="xs" variant={conversation.id === activeId ? "muted" : "default"}>
              {renamingId === conversation.id ? (
                <Input
                  autoFocus
                  aria-label="Nuevo nombre"
                  value={draft}
                  maxLength={60}
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={() => setRenamingId(null)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") commitRename(conversation.id);
                    if (event.key === "Escape") setRenamingId(null);
                  }}
                />
              ) : (
                <>
                  <ItemContent>
                    <ItemTitle className="w-full">
                      <button
                        type="button"
                        className="w-full truncate text-left hover:underline"
                        aria-current={conversation.id === activeId ? "true" : undefined}
                        onClick={() => onSelect(conversation.id)}
                      >
                        {conversation.title}
                      </button>
                    </ItemTitle>
                    <ItemDescription>{relativeTime(conversation.updatedAt, now)}</ItemDescription>
                  </ItemContent>
                  {deletingId === conversation.id ? (
                    <ItemActions role="group" aria-label="Confirmar borrado">
                      <Button variant="destructive" size="xs" onClick={() => { onDelete(conversation.id); setDeletingId(null); }}>
                        Borrar
                      </Button>
                      <Button variant="ghost" size="xs" onClick={() => setDeletingId(null)}>
                        Cancelar
                      </Button>
                    </ItemActions>
                  ) : (
                    <ItemActions>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Renombrar: ${conversation.title}`}
                        onClick={() => {
                          setDraft(conversation.title);
                          setRenamingId(conversation.id);
                        }}
                      >
                        <PencilIcon aria-hidden="true" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" aria-label={`Borrar: ${conversation.title}`} onClick={() => setDeletingId(conversation.id)}>
                        <Trash2Icon aria-hidden="true" />
                      </Button>
                    </ItemActions>
                  )}
                </>
              )}
            </Item>
          ))}
        </ItemGroup>
      )}
    </div>
  );
}
