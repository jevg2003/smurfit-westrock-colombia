"use client";

import "@/lib/zod-config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ChatRuntimeProvider } from "@/features/asistente/chat-runtime";
import { useCompaniesStore } from "@/stores/companies.store";
import { StoreHydrator } from "@/stores/store-hydrator";

/** Providers only the app needs (data fetching, persisted stores, chat runtime); the landing never loads them. */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const activeCompanyId = useCompaniesStore((state) => state.activeCompanyId);

  return (
    <QueryClientProvider client={queryClient}>
      <StoreHydrator />
      {/* A new runtime per company, so no running chat of the previous company survives the switch. */}
      <ChatRuntimeProvider key={activeCompanyId ?? "none"}>{children}</ChatRuntimeProvider>
    </QueryClientProvider>
  );
}
