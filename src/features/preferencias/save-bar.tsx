"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { saveWithFeedback } from "@/lib/notify";

/** What the save bar needs from one form of the tab. */
export interface SaveSection {
  dirty: boolean;
  /** Whether the current values pass the schema. */
  validate(): boolean;
  /** Lets the form show its own issues after a blocked save. */
  showIssues(): void;
  /** Writes the values to the stores. May throw. */
  apply(): void;
  /** Makes the saved values the new baseline of the form. */
  settle(): void;
  /** Goes back to the saved values. */
  discard(): void;
}

interface SaveContextValue {
  register(id: string, read: () => SaveSection): () => void;
  setDirty(id: string, dirty: boolean): void;
  save(): void;
}

const SaveContext = createContext<SaveContextValue | null>(null);

/** One dirty-aware Guardar / Descartar bar for every form of a tab. Forms join it with `useSaveSection`. */
export function SaveBarProvider({ children }: { children: ReactNode }) {
  const readers = useRef(new Map<string, () => SaveSection>());
  const [dirtyIds, setDirtyIds] = useState<ReadonlySet<string>>(new Set());

  const register = useCallback((id: string, read: () => SaveSection) => {
    readers.current.set(id, read);
    return () => {
      readers.current.delete(id);
      setDirtyIds((current) => (current.has(id) ? new Set([...current].filter((item) => item !== id)) : current));
    };
  }, []);

  const setDirty = useCallback((id: string, dirty: boolean) => {
    setDirtyIds((current) => {
      if (current.has(id) === dirty) return current;
      const next = new Set(current);
      if (dirty) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const active = useCallback(() => [...readers.current.values()].map((read) => read()).filter((section) => section.dirty), []);

  const save = useCallback(() => {
    const sections = active();
    const invalid = sections.filter((section) => !section.validate());
    if (invalid.length > 0) {
      for (const section of invalid) section.showIssues();
      return;
    }
    if (saveWithFeedback(() => sections.forEach((section) => section.apply()))) sections.forEach((section) => section.settle());
  }, [active]);

  const value = useMemo(() => ({ register, setDirty, save }), [register, setDirty, save]);

  return (
    <SaveContext.Provider value={value}>
      {children}
      {dirtyIds.size > 0 && (
        <div role="region" aria-label="Cambios sin guardar" className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-3 border-t bg-background px-1 py-3">
          <span className="text-sm text-muted-foreground">Hay cambios sin guardar.</span>
          <Button type="button" size="sm" onClick={save}>
            Guardar cambios
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => active().forEach((section) => section.discard())}>
            Descartar
          </Button>
        </div>
      )}
    </SaveContext.Provider>
  );
}

/** Joins a form to the save bar of its tab; its own submit (Enter) saves everything. */
export function useSaveSection(id: string, section: SaveSection): () => void {
  const context = useContext(SaveContext);
  if (!context) throw new Error("useSaveSection needs a SaveBarProvider.");
  const latest = useRef(section);
  useEffect(() => {
    latest.current = section;
  });
  const { register, setDirty, save } = context;
  useEffect(() => register(id, () => latest.current), [register, id]);
  useEffect(() => setDirty(id, section.dirty), [setDirty, id, section.dirty]);
  return save;
}
