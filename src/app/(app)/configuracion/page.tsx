"use client";

import { BuildingIcon, DatabaseIcon, InfoIcon, SlidersHorizontalIcon } from "lucide-react";
import { DocumentLayout } from "@/components/layouts/document-layout";
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
        { value: "empresa", label: "Empresa", icon: BuildingIcon, content: <DocumentLayout><EmpresaTab /></DocumentLayout> },
        { value: "reglas", label: "Reglas y preferencias", icon: SlidersHorizontalIcon, content: <DocumentLayout><ReglasTab /></DocumentLayout> },
        { value: "fuentes", label: "Fuentes", icon: DatabaseIcon, content: <DocumentLayout><FuentesView /></DocumentLayout> },
        { value: "acerca", label: "Acerca de", icon: InfoIcon, content: <DocumentLayout><AcercaView /></DocumentLayout> },
      ]}
    />
  );
}
