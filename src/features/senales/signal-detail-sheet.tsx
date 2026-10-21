"use client";

import { ExternalLinkIcon } from "lucide-react";
import { useId, useState } from "react";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {signal && <SheetBody key={signal.id} signal={signal} onDone={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  );
}

function SheetBody({ signal, onDone }: { signal: Signal; onDone: () => void }) {
  const noteId = useId();
  const errorId = useId();
  const alert = useAlertsStore((state) => state.alerts.find((item) => item.signalId === signal.id));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const state = alert?.state ?? "new";
  const canAct = state !== "dismissed";

  const review = () => {
    const result = reviewSignal(signal, note);
    if (!result.ok) return setError(result.error.message);
    onDone();
  };

  const dismiss = () => {
    const result = dismissSignal(signal, note);
    if (!result.ok) return setError(result.error.message);
    onDone();
  };

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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={noteId}>Nota (obligatoria para descartar)</Label>
              <Textarea
                id={noteId}
                value={note}
                rows={3}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                placeholder="Por ejemplo: contrato ya renovado"
                onChange={(event) => {
                  setNote(event.target.value);
                  setError(null);
                }}
              />
              {error && (
                <p id={errorId} role="alert" className="text-xs text-destructive-foreground">
                  {error}
                </p>
              )}
            </div>
          ) : (
            !alert?.note && <p className="text-sm text-muted-foreground">Esta alerta fue descartada.</p>
          )}
        </Section>
      </div>

      {canAct && (
        <SheetFooter className="flex-row flex-wrap justify-end gap-2">
          {state === "new" && (
            <Button variant="outline" onClick={review}>
              Marcar revisada
            </Button>
          )}
          <Button variant="destructive" onClick={dismiss}>
            Descartar
          </Button>
        </SheetFooter>
      )}
    </>
  );
}
