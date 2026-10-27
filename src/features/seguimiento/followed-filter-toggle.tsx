"use client";

import Link from "next/link";
import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { useWatchlistStore } from "@/stores/watchlist.store";

/** "Solo lo que sigo": limits a view to the competitors and indicators chosen in Configuración. */
export function FollowedFilterToggle() {
  const id = useId();
  const onlyFollowed = useWatchlistStore((state) => state.onlyFollowed);
  const setOnlyFollowed = useWatchlistStore((state) => state.setOnlyFollowed);

  return (
    <Field orientation="horizontal" className="w-auto flex-wrap gap-x-2 gap-y-1">
      <Checkbox id={id} checked={onlyFollowed} onCheckedChange={(checked) => setOnlyFollowed(checked === true)} />
      <FieldLabel htmlFor={id}>Solo lo que sigo</FieldLabel>
      <Link
        href="/configuracion?tab=reglas"
        className="text-xs text-muted-foreground underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Editar lista
      </Link>
    </Field>
  );
}
