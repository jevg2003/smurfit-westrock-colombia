import type { ReactNode } from "react";

interface Props {
  /** Only for a page without tabs: a tabbed page gets its title from `PageTabs`. */
  title?: string;
  description: ReactNode;
  actions?: ReactNode;
}

/** One-line help text of a view, with an optional title and actions. */
export function PageIntro({ title, description, actions }: Props) {
  return (
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        {title && <h1 className="text-lg font-semibold tracking-tight">{title}</h1>}
        <p className="max-w-prose text-sm text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 print:hidden">{actions}</div>}
    </div>
  );
}
