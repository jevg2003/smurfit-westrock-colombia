"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useChatStore } from "@/stores/chat.store";

const subscribe = (listener: () => void) => useChatStore.persist.onFinishHydration(listener);
const isHydrated = () => useChatStore.persist.hasHydrated();

/** Rehydrates the chat store once per page load (it uses `skipHydration`) and says when it is ready. */
export function useChatHydrated(): boolean {
  const hydrated = useSyncExternalStore(subscribe, isHydrated, () => false);

  useEffect(() => {
    if (!useChatStore.persist.hasHydrated()) void useChatStore.persist.rehydrate();
  }, []);

  return hydrated;
}
