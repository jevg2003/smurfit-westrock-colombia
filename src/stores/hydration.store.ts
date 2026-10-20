import { create } from "zustand";

export interface HydrationState {
  /** True once the persisted stores were rehydrated (or failed trying) after mount. */
  hasHydrated: boolean;
  markHydrated(): void;
}

export function createHydrationStore() {
  return create<HydrationState>()((set) => ({
    hasHydrated: false,
    markHydrated: () => set({ hasHydrated: true }),
  }));
}

export const useHydrationStore = createHydrationStore();
