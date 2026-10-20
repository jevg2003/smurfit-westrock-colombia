import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { AuthGate } from "@/features/auth/auth-gate";
import { PeriodoProvider, PeriodoSelect } from "@/features/trm/periodo";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <PeriodoProvider>
        <AppShell actions={<PeriodoSelect />}>{children}</AppShell>
      </PeriodoProvider>
    </AuthGate>
  );
}
