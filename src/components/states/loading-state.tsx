import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState({ message = "Cargando…" }: { message?: string }) {
  return (
    <div className="flex h-full min-h-32 flex-col justify-center gap-3" role="status" aria-label={message}>
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-2/3" />
    </div>
  );
}
