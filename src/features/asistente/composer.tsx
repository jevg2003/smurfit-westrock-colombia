"use client";

import { revalidateLogic, useForm, type AnyFieldApi } from "@tanstack/react-form";
import { ArrowUpIcon, GlobeIcon, SquareIcon } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useFieldMeta } from "@/components/reui/form-fields";
import { Toggle } from "@/components/ui/toggle";
import { useChatStore } from "@/stores/chat.store";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from "@/components/ui/input-group";
import { messageSchema } from "./message-schema";

interface Props {
  onSubmit(text: string): void;
  /** Shown as a stop button while an answer is on its way. */
  busy?: boolean;
  onStop?(): void;
  placeholder?: string;
}

const hasText = (message: string) => message.trim().length > 0;

interface MessageBoxProps {
  field: AnyFieldApi;
  busy: boolean;
  placeholder: string;
}

/** The textarea of the message field: its limit comes from the message schema; Enter sends, Shift+Enter adds a line. */
function MessageBox({ field, busy, placeholder }: MessageBoxProps) {
  const meta = useFieldMeta(field);
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (hasText(field.state.value) && !busy) void field.form.handleSubmit();
    }
  };

  return (
    <InputGroupTextarea
      name={field.name}
      value={field.state.value}
      rows={2}
      maxLength={meta.maxLength}
      placeholder={placeholder}
      aria-label="Mensaje para el asistente"
      aria-required={meta.required || undefined}
      className="max-h-40 min-h-12"
      onBlur={field.handleBlur}
      onChange={(event) => field.handleChange(event.target.value)}
      onKeyDown={onKeyDown}
    />
  );
}

/** Message box: Enter sends, Shift+Enter adds a line. */
export function Composer({ onSubmit, busy = false, onStop, placeholder = "Escriba su pregunta" }: Props) {
  const webSearch = useChatStore((state) => state.webSearch);
  const setWebSearch = useChatStore((state) => state.setWebSearch);
  const form = useForm({
    defaultValues: { message: "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: messageSchema },
    onSubmit: ({ value, formApi }) => {
      if (busy) return;
      onSubmit(value.message.trim());
      formApi.reset();
    },
  });

  return (
    <form
      noValidate
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <InputGroup>
        <form.Field name="message">{(field) => <MessageBox field={field} busy={busy} placeholder={placeholder} />}</form.Field>
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
            <form.Subscribe selector={(state) => hasText(state.values.message)}>
              {(canSend) => (
                <InputGroupButton type="submit" variant="default" size="icon-xs" className="ml-auto" aria-label="Enviar mensaje" disabled={!canSend}>
                  <ArrowUpIcon aria-hidden="true" />
                </InputGroupButton>
              )}
            </form.Subscribe>
          )}
        </InputGroupAddon>
      </InputGroup>
      <p className="text-xs text-muted-foreground">La IA puede equivocarse. Verifica las fuentes.</p>
    </form>
  );
}
