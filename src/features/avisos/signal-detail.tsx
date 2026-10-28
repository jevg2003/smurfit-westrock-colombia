"use client";

import { revalidateLogic, useForm } from "@tanstack/react-form";
import { ExternalLinkIcon } from "lucide-react";
import { useId, useState } from "react";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { AutoTextareaField } from "@/components/reui/form-fields";
import type { Signal } from "@/core/domain/signal";
import { bogotaDateKey } from "@/core/time/bogota";
import { EVIDENCE_KIND_ICONS } from "@/components/events/event-icons";
import { EVIDENCE_LABELS, PESTEL_LABELS } from "@/features/entorno/labels";
import { SOURCE_NAMES } from "@/features/entorno/sources";
import { formatHoraBogota } from "@/lib/date";
import { safeHttpUrl } from "@/lib/safe-url";
import { useAlertsStore } from "@/stores/alerts.store";
import { dismissWithUndo, reviewWithUndo } from "./alert-actions";
import { AlertStateBadge, DimensionBadge, SeverityBadge } from "./badges";
import { noteSchema, type NoteIntent } from "./note-schema";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

interface Props {
  signal: Signal;
  /** Called after a review or dismissal succeeded. */
  onDone: () => void;
}

/** Why a signal fired, where it comes from, and the review / dismiss actions. Lives in the L2 pane or in a Sheet. */
export function SignalDetail({ signal, onDone }: Props) {
  const formId = useId();
  const alert = useAlertsStore((state) => state.alerts.find((item) => item.signalId === signal.id));
  const [storeError, setStoreError] = useState<string | null>(null);

  const state = alert?.state ?? "new";
  const canAct = state !== "dismissed";

  const form = useForm({
    // `intent` is the button pressed; only "Descartar" demands a note.
    defaultValues: { note: "", intent: "review" as NoteIntent },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: noteSchema },
    onSubmit: ({ value }) => {
      const result = value.intent === "dismiss" ? dismissWithUndo(signal, value.note) : reviewWithUndo(signal, value.note);
      if (!result.ok) return setStoreError(result.error.message);
      onDone();
    },
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <SeverityBadge severity={signal.severity} />
          <DimensionBadge dimension={signal.dimension} />
          <Badge variant="outline">{PESTEL_LABELS[signal.pestel]}</Badge>
          <AlertStateBadge state={state} />
        </div>
        <h2 className="text-base leading-snug font-semibold">{signal.title}</h2>
        <p className="text-sm text-muted-foreground">{signal.detail}</p>
      </header>

      <div className="flex flex-1 flex-col gap-5">
        <Section title="Regla que la activó">
          <p className="text-sm">{signal.ruleText}</p>
          <p className="font-mono text-xs text-muted-foreground">{signal.ruleId}</p>
        </Section>

        <Section title="Evidencia">
          {signal.evidence.length === 0 ? (
            <p className="text-sm text-muted-foreground">Este aviso no trae registros de apoyo.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {signal.evidence.map((item) => {
                const Icon = EVIDENCE_KIND_ICONS[item.kind];
                return (
                  <li key={`${item.kind}:${item.ref}`} className="flex min-w-0 items-start gap-2">
                    <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 break-words">
                      {EVIDENCE_LABELS[item.kind]}: <span className="font-mono text-xs">{item.ref}</span>
                    </span>
                  </li>
                );
              })}
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
                    <Badge variant="info-light" className="ms-2">
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
                {(field) => (
                  <AutoTextareaField
                    field={field}
                    label="Nota"
                    hint="Obligatoria para descartar."
                    rows={3}
                    placeholder="Por ejemplo: contrato ya renovado"
                    extraError={storeError}
                    onEdit={() => setStoreError(null)}
                  />
                )}
              </form.Field>
            </form>
          ) : (
            !alert?.note && <p className="text-sm text-muted-foreground">Este aviso fue descartado.</p>
          )}
        </Section>
      </div>

      {canAct && (
        <div className="sticky bottom-0 mt-auto flex flex-wrap justify-end gap-2 border-t bg-background py-3">
          {state === "new" && (
            <Button
              type="submit"
              form={formId}
              variant="outline"
              onClick={() => {
                form.setFieldValue("intent", "review");
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
              form.setFieldValue("intent", "dismiss");
            }}
          >
            Descartar
          </Button>
        </div>
      )}
    </div>
  );
}
