import type { ReactNode } from "react";

export interface DocumentSection {
  id: string;
  label: string;
}

interface Props {
  /** Optional fixed index; it disappears on a phone. */
  index?: DocumentSection[];
  /** Fixed below the reading column, for example the chat composer. */
  footer?: ReactNode;
  children: ReactNode;
}

/** L4. One reading column of at most 72 characters that scrolls by itself, with an optional index. */
export function DocumentLayout({ index, footer, children }: Props) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 gap-8">
      {index && index.length > 0 && (
        <nav aria-label="Contenido" className="hidden w-44 shrink-0 lg:block print:hidden">
          <ol className="flex flex-col gap-1 text-sm">
            {index.map((section, position) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="flex gap-2 rounded-md px-2 py-1 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span aria-hidden="true" className="tabular-nums">{position + 1}</span>
                  {section.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
        <div className="min-h-0 min-w-0 flex-1 lg:overflow-y-auto print:overflow-visible">
          <div className="flex max-w-[72ch] flex-col gap-6">{children}</div>
        </div>
        {footer && <div className="max-w-[72ch] shrink-0">{footer}</div>}
      </div>
    </div>
  );
}
