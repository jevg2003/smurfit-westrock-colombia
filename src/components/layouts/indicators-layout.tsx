import type { ReactNode } from "react";
import { ScrollRegion } from "./scroll-region";

interface Props {
  /** Period selector, fixed on top. */
  period?: ReactNode;
  notices?: ReactNode;
  /** The indicators as text and variation, without boxes. */
  strip: ReactNode;
  /** One main series, two at most. */
  chart: ReactNode;
  /** Events of the period. They scroll in their own region on a desktop. */
  events: ReactNode;
  eventsLabel?: string;
}

/** L3. Indicator strip, one series and the events of the period. */
export function IndicatorsLayout({ period, notices, strip, chart, events, eventsLabel = "Eventos del período" }: Props) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
      {period}
      {notices}
      <section aria-label="Indicadores" className="shrink-0 overflow-x-auto">
        {strip}
      </section>
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:grid-rows-[minmax(0,1fr)]">
        <ScrollRegion aria-label="Serie">{chart}</ScrollRegion>
        <ScrollRegion aria-label={eventsLabel} className="lg:border-s lg:ps-4">
          {events}
        </ScrollRegion>
      </div>
    </div>
  );
}
