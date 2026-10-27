"use client";

import { ArrowLeftIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { DESKTOP_QUERY, TABLET_QUERY, useMediaQuery } from "./use-media-query";

interface Props {
  filters?: ReactNode;
  notices?: ReactNode;
  list: ReactNode;
  listLabel?: string;
  /** The selected element, or `null` when nothing is selected. */
  detail: ReactNode | null;
  /** Shown in the desktop pane while nothing is selected, so the pane is not empty beside a short list. */
  desktopDetail?: ReactNode;
  detailLabel: string;
  onCloseDetail: () => void;
}

/**
 * L2. List and detail. Desktop (lg): two columns, each scrolling by itself, with the detail fixed. Tablet: the
 * detail opens in a Sheet and the list keeps its width. Phone: the Sheet takes the whole screen and has a way back.
 */
export function ListDetailLayout({ filters, notices, list, listLabel = "Lista", detail, desktopDetail, detailLabel, onCloseDetail }: Props) {
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const tablet = useMediaQuery(TABLET_QUERY);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      {filters}
      {notices}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section aria-label={listLabel} className="min-h-0 min-w-0 lg:overflow-y-auto">
          {list}
        </section>

        {desktop ? (
          <section aria-label={detailLabel} className="min-h-0 min-w-0 overflow-y-auto border-s ps-4">
            {detail ?? desktopDetail ?? (
              <div className="flex h-full min-h-40 items-center justify-center p-6 text-center text-sm text-muted-foreground">
                Elija un elemento de la lista
              </div>
            )}
          </section>
        ) : (
          <Sheet open={detail !== null} onOpenChange={(open) => !open && onCloseDetail()}>
            <SheetContent className="gap-0 overflow-y-auto max-md:max-w-none">
              <SheetTitle className="sr-only">{detailLabel}</SheetTitle>
              {!tablet && (
                <div className="p-2">
                  <Button variant="ghost" size="sm" onClick={onCloseDetail}>
                    <ArrowLeftIcon aria-hidden="true" data-icon="inline-start" />
                    Volver a la lista
                  </Button>
                </div>
              )}
              <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">{detail}</div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </div>
  );
}
