"use client";

import { FileTextIcon, LayoutGridIcon } from "lucide-react";
import { PageTabs } from "@/components/shell/page-tabs";
import { BriefingView } from "@/features/briefing/briefing-view";
import { PestelView } from "@/features/pestel/pestel-view";

export default function AnalisisPage() {
  return (
    <PageTabs
      title="Análisis"
      tabs={[
        { value: "pestel", label: "PESTEL", icon: LayoutGridIcon, content: <PestelView /> },
        { value: "briefing", label: "Briefing", icon: FileTextIcon, content: <BriefingView /> },
      ]}
    />
  );
}
