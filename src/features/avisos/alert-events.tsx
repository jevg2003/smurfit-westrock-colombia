"use client";

import { EventItem, type EventTone } from "@/components/events/event-item";
import { DIMENSION_ICONS } from "@/components/events/event-icons";
import { EventList } from "@/components/events/event-list";
import type { Severity } from "@/core/domain/dimension";
import { DIMENSION_LABELS, SEVERITY_LABELS } from "@/core/labels";
import { SOURCE_NAMES } from "@/features/entorno/sources";
import type { AlertRow } from "./alert-row";
import { reopenWithUndo, reviewWithUndo } from "./alert-actions";

const SEVERITY_TONE: Record<Severity, EventTone> = { alert: "high", watch: "medium", info: "low" };

interface Props {
  rows: AlertRow[];
  /** Id of the signal open in the detail, if any. */
  selectedId?: string;
  onOpen: (row: AlertRow) => void;
}

/**
 * Avisos as events under day headings. Dismissing asks for a note, so «Descartar» opens the detail,
 * where the note is written; review and «Marcar como pendiente» act at once and can be undone.
 */
export function AlertEvents({ rows, selectedId, onOpen }: Props) {
  const items = rows.map((row) => ({ row, at: row.signal.occurredAt }));

  return (
    <EventList
      label="Avisos"
      items={items}
      getKey={({ row }) => row.alert.signalId}
      renderItem={({ row }) => {
        const { signal, alert } = row;
        const DimensionIcon = DIMENSION_ICONS[signal.dimension];
        return (
          <EventItem
            media={<DimensionIcon aria-hidden="true" />}
            title={signal.title}
            at={signal.occurredAt}
            source={signal.provenance[0] ? SOURCE_NAMES[signal.provenance[0].sourceId] : undefined}
            topic={DIMENSION_LABELS[signal.dimension]}
            badge={{ label: SEVERITY_LABELS[signal.severity], tone: SEVERITY_TONE[signal.severity] }}
            state={alert.state}
            detail={signal.detail}
            note={alert.note}
            selected={signal.id === selectedId}
            onOpen={() => onOpen(row)}
            onReview={() => reviewWithUndo(signal)}
            onReopen={() => reopenWithUndo(signal)}
            onDismiss={() => onOpen(row)}
          />
        );
      }}
    />
  );
}
