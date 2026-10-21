"use client";

import { ArrowUpIcon, GlobeIcon, SquareIcon } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { Toggle } from "@/components/ui/toggle";
import { useChatStore } from "@/stores/chat.store";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group";

const MAX_LENGTH = 2000;

interface Props {
  onSubmit(text: string): void;
  /** Shown as a stop button while an answer is on its way. */
  busy?: boolean;
  onStop?(): void;
  placeholder?: string;
}

/** Message box: Enter sends, Shift+Enter adds a line. */
export function Composer({ onSubmit, busy = false, onStop, placeholder = "Escribe tu pregunta" }: Props) {
  const [value, setValue] = useState("");
  const webSearch = useChatStore((state) => state.webSearch);
  const setWebSearch = useChatStore((state) => state.setWebSearch);
  const canSend = value.trim().length > 0 && !busy;

  const send = () => {
    if (!canSend) return;
    onSubmit(value.trim());
    setValue("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  };

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <InputGroup>
        <InputGroupTextarea
          value={value}
          rows={2}
          maxLength={MAX_LENGTH}
          placeholder={placeholder}
          aria-label="Mensaje para el asistente"
          className="max-h-40 min-h-12"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <InputGroupAddon align="block-end">
          <Toggle
            size="sm"
            aria-label="Buscar en internet"
            title={webSearch ? "Busca también en internet" : "Solo usa los datos de la aplicación"}
            pressed={webSearch}
            onPressedChange={setWebSearch}
          >
            <GlobeIcon aria-hidden="true" data-icon="inline-start" />
            <span className="text-xs">Internet</span>
          </Toggle>
          <span className="hidden text-xs text-muted-foreground sm:inline">Enter envía, Shift+Enter agrega una línea</span>
          {busy ? (
            <InputGroupButton variant="outline" size="icon-xs" className="ml-auto" aria-label="Detener respuesta" onClick={onStop}>
              <SquareIcon aria-hidden="true" />
            </InputGroupButton>
          ) : (
            <InputGroupButton type="submit" variant="default" size="icon-xs" className="ml-auto" aria-label="Enviar mensaje" disabled={!canSend}>
              <ArrowUpIcon aria-hidden="true" />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
      <p className="text-xs text-muted-foreground">La IA puede equivocarse. Verifica las fuentes.</p>
    </form>
  );
}
