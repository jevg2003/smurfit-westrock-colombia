import { ArrowDownRightIcon, ArrowRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react";
import Link from "next/link";
import { EventItem } from "@/components/events/event-item";
import { EventList } from "@/components/events/event-list";
import { Badge } from "@/components/reui/badge";
import { IMPACT_LABELS, SEVERITY_LABELS } from "@/core/labels";
import type { Impact } from "@/core/rules/pestel-mapping";
import type { PestelFactorSummary, TrendDirection } from "@/core/usecases/build-pestel";
import { PESTEL_LABELS } from "@/features/entorno/labels";
import { SOURCE_NAMES } from "@/features/entorno/sources";
import { DIMENSION_LABELS } from "@/core/labels";
import { PESTEL_HELP } from "./pestel-help";

const IMPACT_VARIANT = {
  opportunity: "success-light",
  threat: "destructive-light",
  to_evaluate: "warning-light",
} as const;

const SEVERITY_VARIANT = { alert: "destructive-light", watch: "warning-light", info: "info-light" } as const;
const TREND_ICON: Record<TrendDirection, typeof MinusIcon> = { up: ArrowUpRightIcon, down: ArrowDownRightIcon, flat: MinusIcon };
const TREND_SHORT: Record<TrendDirection, string> = { up: "Más", down: "Menos", flat: "Igual" };
const IMPACTS: readonly Impact[] = ["threat", "opportunity", "to_evaluate"];
const TONE = { alert: "high", watch: "medium", info: "low" } as const;

/** One PESTEL factor: counts by severity, count trend, impact chips and the main avisos as events. */
export function FactorDetail({ summary }: { summary: PestelFactorSummary }) {
  const label = PESTEL_LABELS[summary.pestel];
  const TrendIcon = TREND_ICON[summary.trend.direction];

  return (
    <article aria-label={`Factor ${label}`} className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">{label}</h2>
          <span className="text-2xl leading-8 font-semibold tracking-tight tabular-nums">
            {summary.total}
            <span className="sr-only"> avisos en el período</span>
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{PESTEL_HELP[summary.pestel]}</p>
      </header>

      {summary.total === 0 ? (
        <p className="text-sm text-muted-foreground">Sin avisos en este período.</p>
      ) : (
        <div className="flex flex-col gap-2">
          <ul className="flex flex-wrap gap-1.5" aria-label="Avisos por severidad">
            {(["alert", "watch", "info"] as const).map((severity) =>
              summary.bySeverity[severity] > 0 ? (
                <li key={severity}>
                  <Badge variant={SEVERITY_VARIANT[severity]}>
                    {summary.bySeverity[severity]} {SEVERITY_LABELS[severity].toLowerCase()}
                  </Badge>
                </li>
              ) : null,
            )}
          </ul>
          <ul className="flex flex-wrap gap-1.5" aria-label="Impacto por regla">
            {IMPACTS.map((impact) =>
              summary.impacts[impact] > 0 ? (
                <li key={impact}>
                  <Badge variant={IMPACT_VARIANT[impact]}>
                    {IMPACT_LABELS[impact]}: {summary.impacts[impact]}
                  </Badge>
                </li>
              ) : null,
            )}
          </ul>
        </div>
      )}

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground" title={summary.trend.label}>
        <TrendIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        <span>
          {TREND_SHORT[summary.trend.direction]} que el período anterior ({summary.trend.current} frente a {summary.trend.previous}). Es una comparación de conteos, no un pronóstico.
        </span>
      </p>

      {summary.top.length > 0 && (
        <section className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold">Avisos principales</h3>
          <EventList
            flat
            label="Avisos principales"
            items={summary.top.map((signal) => ({ signal, at: signal.occurredAt }))}
            getKey={({ signal }) => signal.id}
            renderItem={({ signal }) => (
              <EventItem
                title={signal.title}
                at={signal.occurredAt}
                source={signal.provenance[0] ? SOURCE_NAMES[signal.provenance[0].sourceId] : undefined}
                topic={DIMENSION_LABELS[signal.dimension]}
                badge={{ label: SEVERITY_LABELS[signal.severity], tone: TONE[signal.severity] }}
                href={signal.provenance[0]?.url}
              />
            )}
          />
        </section>
      )}

      <Link
        href={`/resumen?tab=avisos&pestel=${summary.pestel}`}
        className="inline-flex w-fit items-center gap-1 text-sm underline underline-offset-4 outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Ver avisos de este factor
        <ArrowRightIcon aria-hidden="true" className="size-4" />
      </Link>
    </article>
  );
}
