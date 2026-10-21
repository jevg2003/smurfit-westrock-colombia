import type { Briefing } from "@/core/domain/briefing";
import { ALERT_STATE_LABELS, DIMENSION_LABELS, SEVERITY_LABELS } from "@/core/labels";
import { bogotaDateKey } from "@/core/time/bogota";
import { SOURCE_NAMES } from "@/features/entorno/sources";
import { formatHoraBogota } from "@/lib/date";
import { safeHttpUrl } from "@/lib/safe-url";

/** Printable preview. Plain markup on purpose: it must look the same on paper. */
export function BriefingDocument({ briefing }: { briefing: Briefing }) {
  const total = briefing.sections.reduce((sum, section) => sum + section.signals.length, 0);

  return (
    <article
      aria-label="Vista previa del briefing"
      className="flex min-w-0 flex-col gap-5 rounded-xl border bg-card p-5 text-card-foreground print:border-0 print:p-0 print:text-black"
    >
      <header className="flex flex-col gap-1 border-b pb-3">
        <h2 className="text-xl font-semibold tracking-tight">Briefing del entorno</h2>
        <p className="text-sm">
          Período: <span className="tabular-nums">{bogotaDateKey(briefing.periodFrom)} al {bogotaDateKey(briefing.periodTo)}</span>{" "}
          (hora de Bogotá)
        </p>
        <p className="text-xs text-muted-foreground">Generado el {formatHoraBogota(briefing.generatedAt)}</p>
        <p className="text-xs font-medium">{briefing.note}</p>
      </header>

      {total === 0 && <p className="text-sm text-muted-foreground">Sin señales en este período.</p>}

      {briefing.sections.map((section) => (
        <section key={section.dimension} className="flex flex-col gap-3 break-inside-avoid-page">
          <h3 className="text-base font-semibold">{DIMENSION_LABELS[section.dimension]}</h3>
          <ul className="flex flex-col gap-3">
            {section.signals.map((signal) => {
              const source = signal.provenance[0];
              const url = safeHttpUrl(source?.url);
              return (
                <li key={signal.id} className="flex min-w-0 flex-col gap-0.5 break-inside-avoid text-sm">
                  <span className="font-medium break-words">{signal.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {SEVERITY_LABELS[signal.severity]} · {bogotaDateKey(signal.occurredAt)}
                  </span>
                  <span className="break-words">{signal.detail}</span>
                  <span className="text-xs break-words text-muted-foreground">Regla: {signal.ruleText}</span>
                  {source && (
                    <span className="text-xs break-words text-muted-foreground">
                      Fuente: {SOURCE_NAMES[source.sourceId]} · {source.attribution} · {source.license} · Consultado:{" "}
                      {bogotaDateKey(source.fetchedAt)}
                      {url && (
                        <>
                          {" · "}
                          <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                            Registro original
                          </a>
                        </>
                      )}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {briefing.alerts.length > 0 && (
        <section className="flex flex-col gap-2 break-inside-avoid-page">
          <h3 className="text-base font-semibold">Alertas del período</h3>
          <ul className="flex flex-col gap-1.5 text-sm">
            {briefing.alerts.map((alert) => (
              <li key={alert.signalId} className="break-words">
                <span className="font-medium">{ALERT_STATE_LABELS[alert.state]}</span> · {alert.signalSnapshot.title} (
                {SEVERITY_LABELS[alert.signalSnapshot.severity]}, actualizada el {bogotaDateKey(alert.updatedAt)})
                {alert.note && <span className="text-muted-foreground"> — Nota: {alert.note}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="border-t pt-3 text-xs text-muted-foreground">
        Prototipo no oficial, sin relación ni aval de Smurfit Westrock. {briefing.note}.
      </footer>
    </article>
  );
}
