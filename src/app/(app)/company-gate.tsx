"use client";

import { BuildingIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveCompany } from "@/stores/companies.store";
import { useHydrationStore } from "@/stores/hydration.store";

/** Shown until a company exists and is active. The company picker and the onboarding replace it. */
export function NoCompany() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BuildingIcon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>Todavía no hay una empresa configurada</EmptyTitle>
        <EmptyDescription>Smart Work Core lee el contexto de Colombia para una empresa. Cuando haya una configurada, aquí verás su radar, sus avisos y sus análisis.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

/**
 * Every screen of the app works on the active company, so none of them renders without one. While the stores
 * load there is nothing to decide yet, so the gate waits instead of flashing the empty state.
 */
export function CompanyGate({ children }: { children: ReactNode }) {
  const hasHydrated = useHydrationStore((state) => state.hasHydrated);
  const company = useActiveCompany();

  if (!hasHydrated) return <Skeleton role="status" aria-label="Cargando tu empresa" className="h-72 rounded-xl" />;
  if (!company) return <NoCompany />;
  return <>{children}</>;
}
