"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const MockChart = dynamic(() => import("./mock-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-48 w-full" />,
});

/** Loads recharts in its own chunk after hydration, so the landing's first load stays small. */
export function LazyChart() {
  return <MockChart />;
}
