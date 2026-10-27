import { create } from "zustand";

export interface HydrationState {
  /** True once the persisted stores were rehydrated (or failed trying) after mount. */
  hasHydrated: boolean;
  markHydrated(): void;
  /** Raised again while the stores of another company load, so no screen shows the previous company's data. */
  markHydrating(): void;
}

export function createHydrationStore() {
  return create<HydrationState>()((set) => ({
    hasHydrated: false,
    markHydrated: () => set({ hasHydrated: true }),
    markHydrating: () => set({ hasHydrated: false }),
  }));
}

export const useHydrationStore = createHydrationStore();
