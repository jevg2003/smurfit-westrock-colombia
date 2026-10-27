import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: ReactNode;
  /** Controls at the right of the header, for example a mode toggle. */
  actions?: ReactNode;
  children: ReactNode;
}

/** A chart with its title on the page surface. No card: the layout already separates the regions. */
export function ChartPanel({ title, description, actions, children }: Props) {
  return (
    <figure className="flex min-w-0 flex-col gap-3">
      <figcaption className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-px">
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </figcaption>
      {children}
    </figure>
  );
}
