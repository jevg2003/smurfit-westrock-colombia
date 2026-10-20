import { ArrowRightIcon, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

interface Props {
  icon: LucideIcon;
  label: string;
  meta?: string;
  value: ReactNode;
  delta?: ReactNode;
  hint?: string;
  action: { label: string; href: string };
  children?: ReactNode;
}

export function StatCard({ icon: Icon, label, meta, value, delta, hint, action, children }: Props) {
  return (
    <Card className="h-full min-w-0 gap-0 py-0">
      <CardContent className="flex flex-1 flex-col gap-3 py-4">
        <div className="flex min-w-0 items-center gap-2 text-muted-foreground [&_svg:not([class*=size-])]:size-4">
          <Icon aria-hidden="true" />
          <span className="truncate text-sm font-medium text-foreground">{label}</span>
          {meta && <span className="ms-auto shrink-0 text-xs">{meta}</span>}
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="text-2xl leading-8 font-semibold tracking-tight tabular-nums">{value}</span>
            {delta}
          </div>
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>

        {children && <div className="mt-auto">{children}</div>}
      </CardContent>

      <CardFooter className="border-t bg-muted/50 px-4 py-2">
        <Link
          href={action.href}
          className="group/action flex w-full min-w-0 items-center justify-between gap-3 rounded-full text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="truncate">{action.label}</span>
          <ArrowRightIcon
            aria-hidden="true"
            className="size-4 shrink-0 transition-transform duration-150 group-hover/action:translate-x-0.5 motion-reduce:transition-none"
          />
        </Link>
      </CardFooter>
    </Card>
  );
}
