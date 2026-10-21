"use client";

import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { fitToBudget, type PageContext } from "@/infrastructure/ai/page-context";

interface PageContextHolder {
  get(): PageContext | null;
  set(context: PageContext | null): void;
  subscribe(listener: () => void): () => void;
}

function createHolder(): PageContextHolder {
  let current: PageContext | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set: (context) => {
      current = context;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}

const HolderContext = createContext<PageContextHolder | null>(null);

/** Holds the summary of the screen being shown. Updating it never re-renders the screens. */
export function PageContextProvider({ children }: { children: ReactNode }) {
  const [holder] = useState(createHolder);
  return <HolderContext.Provider value={holder}>{children}</HolderContext.Provider>;
}

/**
 * Each screen calls this with a compact summary of what it shows (route, title, filters, key
 * numbers, a few rows with provenance). It is removed when the screen unmounts. Outside a provider
 * (tests, isolated renders) it does nothing.
 */
export function useRegisterPageContext(summary: PageContext | null) {
  const holder = useContext(HolderContext);
  const serialized = summary ? JSON.stringify(summary) : null;

  useEffect(() => {
    if (!holder || serialized === null) return;
    holder.set(fitToBudget(JSON.parse(serialized) as PageContext));
    return () => holder.set(null);
  }, [holder, serialized]);
}

/** The latest registered summary, or null. Re-renders when it changes. */
export function useCurrentPageContext(): PageContext | null {
  const holder = useContext(HolderContext);
  return useSyncExternalStore(
    (listener) => holder?.subscribe(listener) ?? (() => {}),
    () => holder?.get() ?? null,
    () => null,
  );
}

/** Reads the summary at send time without subscribing to changes. */
export function usePageContextGetter(): () => PageContext | null {
  const holder = useContext(HolderContext);
  return useCallback(() => holder?.get() ?? null, [holder]);
}
