"use client";

import { DownloadIcon, EyeIcon, FileTextIcon, PlusIcon } from "lucide-react";
import { EventItem, type EventTone } from "@/components/events/event-item";
import { EventList } from "@/components/events/event-list";
import { RegionEmpty } from "@/components/states/region-empty";
import { Button } from "@/components/ui/button";
import type { Decision, DecisionStatus } from "@/core/domain/decision";
import { DECISION_STATUS_LABELS } from "@/core/labels";
import { bogotaDateKey } from "@/core/time/bogota";
import { PESTEL_LABELS } from "@/features/entorno/labels";
import { downloadCsv, downloadText } from "@/lib/download";
import { decisionsToCsv, decisionsToMarkdown } from "./decisions-export";

const STATUS_TONE: Record<DecisionStatus, EventTone> = { open: "low", evaluating: "medium", decided: "positive", discarded: "neutral" };

interface Props {
  decisions: Decision[];
  onOpen: (id: string) => void;
  onCreate: () => void;
}

/** The log of decisions the user is weighing, newest first, with create and CSV / Markdown export. */
export function DecisionsSection({ decisions, onOpen, onCreate }: Props) {
  const stem = () => `decisiones-${bogotaDateKey(new Date())}`;
  const newestFirst = [...decisions].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

  return (
    <section aria-label="Decisiones" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3">
        <div className="flex flex-col gap-px">
          <h2 className="text-sm font-semibold">Decisiones</h2>
          <p className="text-xs text-muted-foreground">Las que está pensando, con opciones, a favor y en contra. Se guardan solo en este navegador.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={onCreate}>
            <PlusIcon aria-hidden="true" data-icon="inline-start" />
            Nueva decisión
          </Button>
          <Button variant="outline" size="sm" disabled={decisions.length === 0} onClick={() => downloadCsv(`${stem()}.csv`, decisionsToCsv(decisions))}>
            <DownloadIcon aria-hidden="true" data-icon="inline-start" />
            Exportar CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={decisions.length === 0}
            onClick={() => downloadText(`${stem()}.md`, decisionsToMarkdown(decisions), { mime: "text/markdown" })}
          >
            <FileTextIcon aria-hidden="true" data-icon="inline-start" />
            Exportar Markdown
          </Button>
        </div>
      </div>

      {decisions.length === 0 ? (
        <RegionEmpty title="Aún no hay decisiones" description="Cree una desde una plantilla o en blanco. Puede vincularla a los avisos de cada factor." />
      ) : (
        <EventList
          flat
          label="Decisiones"
          items={newestFirst.map((decision) => ({ decision, at: decision.updatedAt }))}
          getKey={({ decision }) => decision.id}
          renderItem={({ decision }) => (
            <EventItem
              title={decision.title}
              at={decision.updatedAt}
              source="Decisión"
              topic={decision.pestelFactors.map((factor) => PESTEL_LABELS[factor]).join(", ")}
              badge={{ label: DECISION_STATUS_LABELS[decision.status], tone: STATUS_TONE[decision.status] }}
              detail={decision.reviewAt ? `Revisar el ${decision.reviewAt}` : undefined}
              actions={
                <Button variant="ghost" size="sm" aria-label={`Abrir: ${decision.title}`} onClick={() => onOpen(decision.id)}>
                  <EyeIcon aria-hidden="true" data-icon="inline-start" />
                  Abrir
                </Button>
              }
              onOpen={() => onOpen(decision.id)}
            />
          )}
        />
      )}
    </section>
  );
}
