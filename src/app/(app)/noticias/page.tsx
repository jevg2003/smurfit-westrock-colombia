"use client";

import { NewspaperIcon, ScaleIcon } from "lucide-react";
import { PageTabs } from "@/components/shell/page-tabs";
import { NoticiasView } from "@/features/noticias/noticias-view";
import { RegulacionView } from "@/features/regulacion/regulacion-view";

export default function NoticiasPage() {
  return (
    <PageTabs
      title="Noticias"
      tabs={[
        { value: "noticias", label: "Noticias", icon: NewspaperIcon, content: <NoticiasView /> },
        { value: "regulacion", label: "Regulación", icon: ScaleIcon, content: <RegulacionView /> },
      ]}
    />
  );
}
