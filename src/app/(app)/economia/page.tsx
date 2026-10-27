"use client";

import { GlobeIcon, LandmarkIcon, ListOrderedIcon, UsersIcon } from "lucide-react";
import { PageTabs } from "@/components/shell/page-tabs";
import { hasNit } from "@/core/company/profile";
import { CompetidoresView } from "@/features/competidores/competidores-view";
import { ContratacionView } from "@/features/contratacion/contratacion-view";
import { MacroView } from "@/features/macro/macro-view";
import { DiasView } from "@/features/trm/dias-view";
import { useCompany } from "@/stores/companies.store";

export default function EconomiaPage() {
  // Public contracts and competitor financials are looked up by NIT: without one those tabs do not exist.
  const withNit = hasNit(useCompany());

  return (
    <PageTabs
      title="Economía"
      tabs={[
        { value: "macro", label: "Macro", icon: GlobeIcon, content: <MacroView /> },
        { value: "trm", label: "TRM", icon: ListOrderedIcon, content: <DiasView /> },
        { value: "contratacion", label: "Contratación", icon: LandmarkIcon, content: <ContratacionView />, hidden: !withNit },
        { value: "competidores", label: "Competidores", icon: UsersIcon, content: <CompetidoresView />, hidden: !withNit },
      ]}
    />
  );
}
