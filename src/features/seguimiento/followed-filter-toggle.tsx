"use client";

import Link from "next/link";
import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useWatchlistStore } from "@/stores/watchlist.store";

/** "Solo mis seguimientos": limits a screen to the competitors and indicators on the watchlist. */
export function FollowedFilterToggle() {
  const id = useId();
  const onlyFollowed = useWatchlistStore((state) => state.onlyFollowed);
  const setOnlyFollowed = useWatchlistStore((state) => state.setOnlyFollowed);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <Checkbox id={id} checked={onlyFollowed} onCheckedChange={(checked) => setOnlyFollowed(checked === true)} />
      <Label htmlFor={id}>Solo mis seguimientos</Label>
      <Link
        href="/seguimiento"
        className="text-xs text-muted-foreground underline underline-offset-4 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Editar lista
      </Link>
    </div>
  );
}
