"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

/** How long the notice stays, in milliseconds. */
export const UNDO_NOTICE_MS = 6000;

interface Notice {
  id: number;
  message: string;
  undo: () => void;
}

let current: Notice | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let nextId = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** Removes the notice now, without undoing. */
export function dismissUndoNotice() {
  clearTimeout(timer);
  current = null;
  emit();
}

/** Tells the person what just happened and lets them take it back for a few seconds. Only the latest notice is kept. */
export function notifyUndo(message: string, undo: () => void) {
  clearTimeout(timer);
  current = { id: ++nextId, message, undo };
  timer = setTimeout(dismissUndoNotice, UNDO_NOTICE_MS);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Mount once in the app shell. */
export function UndoNoticeHost() {
  const notice = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
  if (!notice) return null;

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-center print:hidden">
      <div
        role="status"
        className="pointer-events-auto flex items-center gap-3 rounded-lg border bg-popover py-1.5 ps-3 pe-1.5 text-sm text-popover-foreground shadow-lg"
      >
        <span>{notice.message}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            notice.undo();
            dismissUndoNotice();
          }}
        >
          Deshacer
        </Button>
      </div>
    </div>
  );
}
