import { CheckIcon, ExternalLinkIcon, RotateCcwIcon, XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { formatHoraBogota } from "@/lib/date";
import { relativeTime } from "@/lib/relative-time";
import { safeHttpUrl } from "@/lib/safe-url";
import { cn } from "@/lib/utils";

export type EventTone = "high" | "medium" | "low" | "positive" | "neutral";

/** Badge variant per tone. Always `-light` or `outline`; never solid and never `secondary`. */
const TONE_VARIANT = {
  high: "destructive-light",
  medium: "warning-light",
  low: "info-light",
  positive: "success-light",
  neutral: "outline",
} as const;

export interface EventBadge {
  label: string;
  tone: EventTone;
}

export type EventState = "new" | "reviewed" | "dismissed";

export interface EventItemProps {
  title: string;
  /** ISO instant. Omit for an item that has no date yet. */
  at?: string;
  /** Plain outlet name, or a source badge with its own icon. */
  source?: ReactNode;
  topic?: string;
  /** The one severity or state badge of the row. */
  badge?: EventBadge;
  state?: EventState;
  /** The fact behind the event, one short line. */
  detail?: string;
  /** What it means for the active company, in one sentence. Omit when there is none. */
  why?: string;
  /** Free line under the body, for example the note of a review. */
  note?: string;
  /** Original record. Only a safe http(s) url becomes a link. */
  href?: string;
  /** Decorative leading visual, such as a kind icon. Sits between the "new" dot and the body; must be aria-hidden. */
  media?: ReactNode;
  selected?: boolean;
  onOpen?: () => void;
  onReview?: () => void;
  onReopen?: () => void;
  onDismiss?: () => void;
  /** Extra actions, placed after the standard ones. */
  actions?: ReactNode;
  /** Extra body under the lines of the event, for example a collapsed list of facts. */
  children?: ReactNode;
  /** Reference instant for the relative time; tests pass a fixed one. */
  now?: Date;
}

function Dot() {
  return <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-muted-foreground/60" />;
}

const focusRing = "rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * One event of the environment: what changed, where it comes from, when, and why it matters to the company.
 * The single implementation behind every list of Radar, Avisos, Línea de tiempo, Noticias and Regulación.
 */
export function EventItem({
  title,
  at,
  source,
  topic,
  badge,
  state,
  detail,
  why,
  note,
  href,
  media,
  selected,
  onOpen,
  onReview,
  onReopen,
  onDismiss,
  actions,
  children,
  now,
}: EventItemProps) {
  const url = href ? safeHttpUrl(href) : undefined;
  const isNew = state === "new";
  const dismissed = state === "dismissed";
  const shownBadge = dismissed ? ({ label: "Descartado", tone: "neutral" } satisfies EventBadge) : badge;
  const titleClass = cn("text-start text-sm leading-snug text-pretty", isNew ? "font-medium" : "font-normal");

  const titleNode = onOpen ? (
    <button type="button" onClick={onOpen} className={cn(titleClass, focusRing)}>
      {title}
    </button>
  ) : url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className={cn(titleClass, focusRing, "inline-flex items-start gap-1")}>
      {title}
      <ExternalLinkIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <span className="sr-only">(se abre en una pestaña nueva)</span>
    </a>
  ) : (
    <span className={titleClass}>{title}</span>
  );

  const hasActions = !dismissed && Boolean(onReview || onReopen || onDismiss || actions);

  return (
    <li
      data-state={state}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "group/event relative flex min-w-0 items-start gap-3 px-3 py-3 transition-colors hover:bg-muted/50",
        selected && "bg-muted",
        dismissed && "opacity-60",
      )}
    >
      <span className="mt-1.5 flex size-2 shrink-0 items-center justify-center">
        {isNew && (
          <>
            <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
            <span className="sr-only">Nuevo</span>
          </>
        )}
      </span>

      {media && (
        <span data-slot="event-media" className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">
          {media}
        </span>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-start justify-between gap-3">
          {titleNode}
          {at && (
            <time dateTime={at} title={formatHoraBogota(at)} className="shrink-0 text-xs whitespace-nowrap text-muted-foreground tabular-nums">
              {relativeTime(at, now)}
            </time>
          )}
        </div>

        <div className={cn("flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs", state === "reviewed" ? "text-muted-foreground/80" : "text-muted-foreground")}>
          {source && <span>{source}</span>}
          {source && topic && <Dot />}
          {topic && <span>{topic}</span>}
          {shownBadge && (
            <Badge variant={TONE_VARIANT[shownBadge.tone]} className={source || topic ? "ms-auto" : undefined}>
              {shownBadge.label}
            </Badge>
          )}
        </div>

        {detail && <p className="text-xs text-muted-foreground text-pretty">{detail}</p>}
        {why && <p className="text-sm text-foreground/80 text-pretty">{why}</p>}
        {note && <p className="text-xs text-muted-foreground text-pretty">Nota: {note}</p>}
        {children}

        {hasActions && (
          <div className="flex flex-wrap items-center gap-1 pt-1 md:opacity-0 md:group-focus-within/event:opacity-100 md:group-hover/event:opacity-100">
            {onReview && state === "new" && (
              <Button variant="outline" size="sm" aria-label={`Revisar: ${title}`} onClick={onReview}>
                <CheckIcon aria-hidden="true" data-icon="inline-start" />
                Revisar
              </Button>
            )}
            {onReopen && state === "reviewed" && (
              <Button variant="ghost" size="sm" aria-label={`Marcar como pendiente: ${title}`} onClick={onReopen}>
                <RotateCcwIcon aria-hidden="true" data-icon="inline-start" />
                Marcar como pendiente
              </Button>
            )}
            {onDismiss && (
              <Button variant="ghost" size="sm" aria-label={`Descartar: ${title}`} onClick={onDismiss}>
                <XIcon aria-hidden="true" data-icon="inline-start" />
                Descartar
              </Button>
            )}
            {actions}
          </div>
        )}
      </div>
    </li>
  );
}
