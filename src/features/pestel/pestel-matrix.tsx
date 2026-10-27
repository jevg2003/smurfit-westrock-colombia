import { ArrowDownRightIcon, ArrowRightIcon, ArrowUpRightIcon, ExternalLinkIcon, MinusIcon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/reui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { Impact } from "@/core/rules/pestel-mapping";
import { IMPACT_LABELS, SEVERITY_LABELS } from "@/core/labels";
import { bogotaDateKey } from "@/core/time/bogota";
import type { PestelFactorSummary, TrendDirection } from "@/core/usecases/build-pestel";
import { PESTEL_LABELS } from "@/features/entorno/labels";
import { SeverityBadge } from "@/features/avisos/badges";
import { safeHttpUrl } from "@/lib/safe-url";
import { PESTEL_HELP } from "./pestel-help";

const IMPACT_VARIANT = {
  opportunity: "success-light",
  threat: "destructive-light",
  to_evaluate: "warning-light",
} as const;

const TREND_ICON: Record<TrendDirection, typeof MinusIcon> = {
  up: ArrowUpRightIcon,
  down: ArrowDownRightIcon,
  flat: MinusIcon,
};

const TREND_SHORT: Record<TrendDirection, string> = { up: "Más", down: "Menos", flat: "Igual" };

const IMPACTS: readonly Impact[] = ["threat", "opportunity", "to_evaluate"];

/** One PESTEL factor: counts by severity, count trend, impact chips and the top signals. */
export function FactorCard({ summary }: { summary: PestelFactorSummary }) {
  const label = PESTEL_LABELS[summary.pestel];
  const TrendIcon = TREND_ICON[summary.trend.direction];

  return (
    <Card role="article" className="h-full min-w-0 gap-0 py-0" aria-label={`Factor ${label}`}>
      <CardContent className="flex flex-1 flex-col gap-3 py-4">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium">{label}</h2>
            <span className="text-2xl leading-8 font-semibold tracking-tight tabular-nums">
              {summary.total}
              <span className="sr-only"> avisos en el período</span>
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{PESTEL_HELP[summary.pestel]}</p>
        </div>

        {summary.total === 0 ? (
          <p className="text-sm text-muted-foreground">Sin avisos en este período.</p>
        ) : (
          <>
            <ul className="flex flex-wrap gap-1.5" aria-label="Avisos por severidad">
              {(["alert", "watch", "info"] as const).map((severity) =>
                summary.bySeverity[severity] > 0 ? (
                  <li key={severity}>
                    <Badge variant={severity === "alert" ? "destructive-light" : severity === "watch" ? "warning-light" : "info-light"} size="sm">
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
                    <Badge variant={IMPACT_VARIANT[impact]} size="sm">
                      {IMPACT_LABELS[impact]}: {summary.impacts[impact]}
                    </Badge>
                  </li>
                ) : null,
              )}
            </ul>
          </>
        )}

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground" title={summary.trend.label}>
          <TrendIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {TREND_SHORT[summary.trend.direction]} que el período anterior ({summary.trend.current} frente a{" "}
            {summary.trend.previous}). Es una comparación de conteos, no un pronóstico.
          </span>
        </p>

        {summary.top.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Avisos principales</h3>
            <ul className="flex flex-col gap-2">
              {summary.top.map((signal) => {
                const source = signal.provenance[0];
                const url = safeHttpUrl(source?.url);
                return (
                  <li key={signal.id} className="flex min-w-0 flex-col gap-1 text-sm">
                    <span className="font-medium break-words">{signal.title}</span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <SeverityBadge severity={signal.severity} />
                      <span className="tabular-nums">{bogotaDateKey(signal.occurredAt)}</span>
                      {url && (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          Registro original
                          <ExternalLinkIcon aria-hidden="true" className="size-3" />
                        </a>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>

      <CardFooter className="border-t bg-muted/50 px-4 py-2">
        <Link
          href={`/resumen?tab=avisos&pestel=${summary.pestel}`}
          className="group/action flex w-full min-w-0 items-center justify-between gap-3 rounded-full text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="truncate">Ver avisos de este factor</span>
          <ArrowRightIcon aria-hidden="true" className="size-4 shrink-0" />
        </Link>
      </CardFooter>
    </Card>
  );
}
