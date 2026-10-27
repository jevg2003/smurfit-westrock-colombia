import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { PeriodoProvider, PeriodoSelect } from "@/features/trm/periodo";
import { AppProviders } from "./app-providers";
import { CompanyGate } from "./company-gate";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppProviders>
      <PeriodoProvider>
        <AppShell actions={<PeriodoSelect />}>
          <CompanyGate>{children}</CompanyGate>
        </AppShell>
      </PeriodoProvider>
    </AppProviders>
  );
}
