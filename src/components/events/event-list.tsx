import { Fragment, type ReactNode } from "react";
import { groupByDay } from "./group-by-day";

interface Props<T extends { at: string }> {
  /** Names the lists for assistive technology, for example "Avisos". */
  label: string;
  items: readonly T[];
  getKey: (item: T) => string;
  /** Must return an `EventItem` (an `li`). */
  renderItem: (item: T) => ReactNode;
  now?: Date;
  /** One list in the given order, without day headings (for feeds ordered by relevance). */
  flat?: boolean;
}

/**
 * Events under sticky day headings, separated by thin lines. The headings stick to the top of the
 * scrolling region that contains the list (the column of the layout), never to the page.
 */
export function EventList<T extends { at: string }>({ label, items, getKey, renderItem, now, flat }: Props<T>) {
  if (items.length === 0) return null;
  if (flat) {
    return (
      <ul aria-label={label} className="flex flex-col divide-y">
        {items.map((item) => (
          <Fragment key={getKey(item)}>{renderItem(item)}</Fragment>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col">
      {groupByDay(items, now).map((group) => (
        <div key={group.key}>
          <h3 className="sticky top-0 z-[1] bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground">{group.label}</h3>
          <ul aria-label={`${label}: ${group.label}`} className="flex flex-col divide-y">
            {group.items.map((item) => (
              <Fragment key={getKey(item)}>{renderItem(item)}</Fragment>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
