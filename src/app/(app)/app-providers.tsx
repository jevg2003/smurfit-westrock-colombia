"use client";

import "@/lib/zod-config";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ChatRuntimeProvider } from "@/features/asistente/chat-runtime";
import { StoreHydrator } from "@/stores/store-hydrator";

/** Providers only the app needs (data fetching, persisted stores, chat runtime); the landing never loads them. */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <StoreHydrator />
      <ChatRuntimeProvider>{children}</ChatRuntimeProvider>
    </QueryClientProvider>
  );
}
