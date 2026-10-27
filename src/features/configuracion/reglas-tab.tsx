"use client";

import { PreferenciasView } from "@/features/preferencias/preferencias-view";
import { SeguimientoSettings } from "@/features/seguimiento/seguimiento-settings";

/** Rules and preferences (thresholds, search terms) and what the user follows, in one tab. */
export function ReglasTab() {
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <PreferenciasView />
      <SeguimientoSettings />
    </div>
  );
}
