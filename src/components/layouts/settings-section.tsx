import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  [key: string]: unknown;
}

/**
 * A group of related settings on the page surface, separated from the next by a thin line. It replaces
 * `Card` for forms and reading blocks: the screen already has one container, so sections are not boxes.
 * Extra props (such as `size`, `className`) are ignored on purpose, so every section looks the same.
 */
export function SettingsSection({ children }: Props) {
  return <section className="flex min-w-0 flex-col gap-3 border-b pb-6 last:border-b-0 last:pb-0">{children}</section>;
}

export function SettingsHeader({ children }: Props) {
  return <div className="flex flex-col gap-0.5">{children}</div>;
}

export function SettingsTitle({ children }: Props) {
  return <h2 className="text-sm font-semibold">{children}</h2>;
}

export function SettingsDescription({ children }: Props) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export function SettingsContent({ children }: Props) {
  return <div className="flex min-w-0 flex-col gap-4">{children}</div>;
}

export function SettingsFooter({ children }: Props) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}
