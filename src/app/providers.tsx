"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

/** Root providers: theme only, so the static landing stays light. App-only providers live in `(app)/app-providers.tsx`. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="swc:theme">
      {children}
    </ThemeProvider>
  );
}
