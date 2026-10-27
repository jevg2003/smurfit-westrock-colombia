"use client";

import { BuildingIcon, DatabaseIcon, InfoIcon, SlidersHorizontalIcon } from "lucide-react";
import { PageTabs } from "@/components/shell/page-tabs";
import { AcercaView } from "@/features/acerca/acerca-view";
import { EmpresaTab } from "@/features/configuracion/empresa-tab";
import { ReglasTab } from "@/features/configuracion/reglas-tab";
import { FuentesView } from "@/features/fuentes/fuentes-view";

export default function ConfiguracionPage() {
  return (
    <PageTabs
      title="Configuración"
      tabs={[
        { value: "empresa", label: "Empresa", icon: BuildingIcon, content: <EmpresaTab /> },
        { value: "reglas", label: "Reglas y preferencias", icon: SlidersHorizontalIcon, content: <ReglasTab /> },
        { value: "fuentes", label: "Fuentes", icon: DatabaseIcon, content: <FuentesView /> },
        { value: "acerca", label: "Acerca de", icon: InfoIcon, content: <AcercaView /> },
      ]}
    />
  );
}
