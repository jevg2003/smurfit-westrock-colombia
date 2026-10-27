"use client";

import { BellRingIcon, HistoryIcon, RadarIcon } from "lucide-react";
import { PageTabs } from "@/components/shell/page-tabs";
import { AvisosView } from "@/features/avisos/avisos-view";
import { RadarView } from "@/features/radar/radar-view";
import { TimelineView } from "@/features/timeline/timeline-view";

export default function ResumenPage() {
  return (
    <PageTabs
      title="Resumen"
      tabs={[
        { value: "radar", label: "Radar", icon: RadarIcon, content: <RadarView /> },
        { value: "avisos", label: "Avisos", icon: BellRingIcon, content: <AvisosView /> },
        { value: "linea-de-tiempo", label: "Línea de tiempo", icon: HistoryIcon, content: <TimelineView /> },
      ]}
    />
  );
}
