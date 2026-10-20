"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState, type ReactNode } from "react";
import { StoreHydrator } from "@/stores/store-hydrator";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="smurfit-trm:tema">
      <QueryClientProvider client={queryClient}>
        <StoreHydrator />
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
