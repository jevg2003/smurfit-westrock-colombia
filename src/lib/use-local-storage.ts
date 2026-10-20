"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

const noopSubscribe = () => () => {};

/** `false` on the server and during hydration, `true` once the client can read localStorage. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/** JSON value persisted in localStorage. `initial` must be a stable reference. */
export function useLocalStorage<T>(key: string, initial: T) {
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => null,
  );

  const value = useMemo<T>(() => {
    if (raw === null) return initial;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return initial;
    }
  }, [raw, initial]);

  const setValue = useCallback(
    (next: T | ((previous: T) => T)) => {
      const current = read(key);
      const previous = current === null ? initial : (JSON.parse(current) as T);
      const resolved = typeof next === "function" ? (next as (previous: T) => T)(previous) : next;
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        return;
      }
      listeners.forEach((listener) => listener());
    },
    [key, initial],
  );

  return [value, setValue] as const;
}
