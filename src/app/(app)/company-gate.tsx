"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveCompany, useCompaniesStore } from "@/stores/companies.store";
import { useHydrationStore } from "@/stores/hydration.store";

/**
 * Every screen of the app works on the active company, so none of them renders without one. While the stores
 * load there is nothing to decide yet, so the gate waits. Then no companies goes to the onboarding and
 * companies without an active one go to the picker.
 */
export function CompanyGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hasHydrated = useHydrationStore((state) => state.hasHydrated);
  const company = useActiveCompany();
  const hasCompanies = useCompaniesStore((state) => state.companies.length > 0);

  const redirectTo = !hasHydrated || company ? null : hasCompanies ? "/empresas" : "/onboarding";
  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  if (!hasHydrated || !company) return <Skeleton role="status" aria-label="Cargando tu empresa" className="h-72 rounded-xl" />;
  return <>{children}</>;
}
