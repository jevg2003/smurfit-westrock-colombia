"use client";

import type { LucideIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface PageTab {
  value: string;
  label: string;
  icon: LucideIcon;
  /** Only the active tab renders its content, so a page never loads every view at once. */
  content: ReactNode;
  /** A hidden tab is not listed and cannot be opened from the URL. */
  hidden?: boolean;
}

interface Props {
  /** The h1 of the page; the tabs are its sections. */
  title: string;
  tabs: PageTab[];
}

function PageTabsContent({ title, tabs }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const requested = useSearchParams()?.get("tab");
  const visible = tabs.filter((tab) => !tab.hidden);
  const active = visible.find((tab) => tab.value === requested) ?? visible[0];
  if (!active) return null;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      <h1 className="shrink-0 text-xl font-semibold tracking-tight">{title}</h1>
      <Tabs
        value={active.value}
        onValueChange={(value) => router.push(`${pathname}?tab=${String(value)}`, { scroll: false })}
        className="min-h-0 min-w-0 flex-1 gap-3"
      >
        <TabsList aria-label={`Secciones de ${title}`} className="w-full shrink-0 justify-start overflow-x-auto sm:justify-center">
          {visible.map(({ value, label: text, icon: Icon }) => (
            <TabsTrigger key={value} value={value} className="flex-none px-3 sm:flex-1">
              <Icon aria-hidden="true" />
              {text}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={active.value} className="flex min-h-0 min-w-0 flex-1 flex-col">
          {active.content}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Tabs of a page, with the active one kept in the URL (`?tab=`) so it can be shared and the back button works. */
export function PageTabs(props: Props) {
  return (
    <Suspense fallback={null}>
      <PageTabsContent {...props} />
    </Suspense>
  );
}
