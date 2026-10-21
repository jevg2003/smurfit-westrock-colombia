import type { ReactNode } from "react";

interface Props {
  title: string;
  description: ReactNode;
  actions?: ReactNode;
}

/** Page title with a one-line help text. */
export function PageIntro({ title, description, actions }: Props) {
  return (
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        <p className="max-w-prose text-sm text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 print:hidden">{actions}</div>}
    </div>
  );
}
