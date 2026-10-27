import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  label: string;
  rows?: number;
}

/** Loading shape of an event list: a dot, two lines and a badge per row. No centered spinner. */
export function EventListSkeleton({ label, rows = 5 }: Props) {
  return (
    <div role="status" aria-label={label} className="flex flex-col divide-y">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} data-slot="skeleton-row" className="flex items-start gap-3 px-3 py-3">
          <Skeleton className="mt-1.5 size-2 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-5 w-12" />
        </div>
      ))}
    </div>
  );
}
