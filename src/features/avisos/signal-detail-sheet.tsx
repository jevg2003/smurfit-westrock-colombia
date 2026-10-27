"use client";

import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { Signal } from "@/core/domain/signal";
import { SignalDetail } from "./signal-detail";

interface Props {
  signal: Signal | null;
  onOpenChange: (open: boolean) => void;
}

/** The detail of one aviso in a Sheet, for the lists that have no detail pane (Radar, Línea de tiempo). */
export function SignalDetailSheet({ signal, onOpenChange }: Props) {
  return (
    <Sheet open={signal !== null} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 overflow-y-auto px-4 pt-12 pb-0">
        <SheetTitle className="sr-only">Detalle del aviso</SheetTitle>
        {signal && <SignalDetail key={signal.id} signal={signal} onDone={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  );
}
