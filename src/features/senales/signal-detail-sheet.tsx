"use client";

import { revalidateLogic, useForm } from "@tanstack/react-form";
import { ExternalLinkIcon } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { Signal } from "@/core/domain/signal";
import { bogotaDateKey } from "@/core/time/bogota";
import { EVIDENCE_LABELS, PESTEL_LABELS } from "@/features/entorno/labels";
import { SOURCE_NAMES } from "@/features/entorno/sources";
import { formatHoraBogota } from "@/lib/date";
import { safeHttpUrl } from "@/lib/safe-url";
import { useAlertsStore } from "@/stores/alerts.store";
import { dismissSignal, reviewSignal } from "./alert-actions";
import { AlertStateBadge, DimensionBadge, SeverityBadge } from "./badges";
import { noteSchema, type NoteIntent } from "./note-schema";

interface Props {
  signal: Signal | null;
  onOpenChange: (open: boolean) => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

/** Why a signal fired, where it comes from, and the review / dismiss actions. */
export function SignalDetailSheet({ signal, onOpenChange }: Props) {
  return (
    <Sheet open={signal !== null} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        {signal && <SheetBody key={signal.id} signal={signal} onDone={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  );
}

function SheetBody({ signal, onDone }: { signal: Signal; onDone: () => void }) {
  const noteId = useId();
  const formId = useId();
  const alert = useAlertsStore((state) => state.alerts.find((item) => item.signalId === signal.id));
  // Which button was pressed; the schema reads it, so only "Descartar" demands a note.
  const intent = useRef<NoteIntent>("review");
  const [storeError, setStoreError] = useState<string | null>(null);

  const state = alert?.state ?? "new";
  const canAct = state !== "dismissed";

  const form = useForm({
    defaultValues: { note: "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: noteSchema(() => intent.current) },
    onSubmit: ({ value }) => {
      const result = intent.current === "dismiss" ? dismissSignal(signal, value.note) : reviewSignal(signal, value.note);
      if (!result.ok) return setStoreError(result.error.message);
      onDone();
    },
  });

  return (
    <>
      <SheetHeader className="gap-2 pe-12">
        <div className="flex flex-wrap items-center gap-1.5">
          <SeverityBadge severity={signal.severity} />
          <DimensionBadge dimension={signal.dimension} />
          <Badge variant="outline" size="sm">
            {PESTEL_LABELS[signal.pestel]}
          </Badge>
          <AlertStateBadge state={state} />
        </div>
        <SheetTitle className="text-base leading-snug">{signal.title}</SheetTitle>
        <SheetDescription>{signal.detail}</SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-5 px-4">
        <Section title="Regla que la activó">
          <p className="text-sm">{signal.ruleText}</p>
          <p className="font-mono text-xs text-muted-foreground">{signal.ruleId}</p>
        </Section>

        <Section title="Evidencia">
          {signal.evidence.length === 0 ? (
            <p className="text-sm text-muted-foreground">Esta señal no trae registros de apoyo.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {signal.evidence.map((item) => (
                <li key={`${item.kind}:${item.ref}`} className="min-w-0 break-words">
                  {EVIDENCE_LABELS[item.kind]}: <span className="font-mono text-xs">{item.ref}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">Ocurrió el {bogotaDateKey(signal.occurredAt)} (hora de Bogotá).</p>
        </Section>

        <Section title="Procedencia">
          {signal.provenance.map((source) => {
            const url = safeHttpUrl(source.url);
            return (
              <dl key={`${source.sourceId}:${source.url}`} className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-muted-foreground">Fuente</dt>
                <dd className="min-w-0 break-words">
                  {SOURCE_NAMES[source.sourceId]}
                  {source.curated && (
                    <Badge variant="info-light" size="sm" className="ms-2">
                      Curado manualmente
                    </Badge>
                  )}
                </dd>
                <dt className="text-muted-foreground">Atribución</dt>
                <dd className="min-w-0 break-words">{source.attribution}</dd>
                <dt className="text-muted-foreground">Licencia</dt>
                <dd>{source.license}</dd>
                <dt className="text-muted-foreground">Consultado</dt>
                <dd>{formatHoraBogota(source.fetchedAt)}</dd>
                {url && (
                  <>
                    <dt className="text-muted-foreground">Enlace</dt>
                    <dd>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        Ver registro original
                        <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
                      </a>
                    </dd>
                  </>
                )}
              </dl>
            );
          })}
        </Section>

        <Section title="Seguimiento">
          {alert?.note && (
            <p className="text-sm">
              <span className="text-muted-foreground">Nota guardada: </span>
              {alert.note}
            </p>
          )}
          {canAct ? (
            <form
              id={formId}
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                void form.handleSubmit();
              }}
            >
              <form.Field name="note">
                {(field) => {
                  const invalid = !field.state.meta.isValid || storeError !== null;
                  return (
                    <Field data-invalid={invalid}>
                      <FieldLabel htmlFor={noteId}>Nota (obligatoria para descartar)</FieldLabel>
                      <Textarea
                        id={noteId}
                        value={field.state.value}
                        rows={3}
                        aria-invalid={invalid || undefined}
                        placeholder="Por ejemplo: contrato ya renovado"
                        onBlur={field.handleBlur}
                        onChange={(event) => {
                          field.handleChange(event.target.value);
                          setStoreError(null);
                        }}
                      />
                      {!field.state.meta.isValid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : (
                        storeError && <FieldError>{storeError}</FieldError>
                      )}
                    </Field>
                  );
                }}
              </form.Field>
            </form>
          ) : (
            !alert?.note && <p className="text-sm text-muted-foreground">Esta alerta fue descartada.</p>
          )}
        </Section>
      </div>

      {canAct && (
        <SheetFooter className="flex-row flex-wrap justify-end gap-2">
          {state === "new" && (
            <Button
              type="submit"
              form={formId}
              variant="outline"
              onClick={() => {
                intent.current = "review";
              }}
            >
              Marcar revisada
            </Button>
          )}
          <Button
            type="submit"
            form={formId}
            variant="destructive"
            onClick={() => {
              intent.current = "dismiss";
            }}
          >
            Descartar
          </Button>
        </SheetFooter>
      )}
    </>
  );
}
