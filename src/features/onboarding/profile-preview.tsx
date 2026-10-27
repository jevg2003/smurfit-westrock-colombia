import { ArchiveIcon, FileTextIcon, InboxIcon, SearchIcon, SendIcon, ShieldIcon, StarIcon, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/reui/badge";
import { CompanyAvatar } from "@/components/shell/company-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { OnboardingDraft } from "@/core/onboarding/draft";
import { buildPreview, type Preview, type PreviewRow, type PreviewRowId } from "@/core/onboarding/preview";
import { cn } from "@/lib/utils";

const ROW_HEADINGS: Record<PreviewRowId, string> = {
  activity: "Actividad",
  competitors: "Competidores",
  news: "Noticias del sector",
  regulation: "Regulación",
  goals: "Objetivos",
};

const FILTERS = ["Todo", "Competidores", "Noticias", "Regulación", "Objetivos"] as const;
const RAIL_ICONS: readonly LucideIcon[] = [InboxIcon, StarIcon, SendIcon, FileTextIcon, ArchiveIcon, ShieldIcon];

/** The value arrives with a short fade; reduced motion shows it at once. */
const REVEAL = "animate-in fade-in-0 duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none";

/** A soft bar that stands for a value the app does not know yet. */
function Bar({ className }: { className?: string }) {
  return <Skeleton data-state="pending" aria-hidden="true" className={cn("h-2 rounded-full bg-muted-foreground/20 blur-[0.4px]", className)} />;
}

/** The text when known; otherwise a bar. The bar and the text swap with the same slot size. */
function Slot({ value, barClassName, className }: { value: string | null; barClassName: string; className?: string }) {
  return value === null ? <Bar className={barClassName} /> : <span className={cn("block truncate", REVEAL, className)}>{value}</span>;
}

function PreviewRowItem({ row }: { row: PreviewRow }) {
  const skeletonTags = row.tags.length === 0;
  return (
    <li data-known={row.known} className="flex items-start gap-2.5 border-b px-3 py-2.5 last:border-b-0">
      <span aria-hidden="true" className={cn("mt-1.5 size-1.5 shrink-0 rounded-full transition-colors", row.known ? "bg-primary" : "bg-muted-foreground/30")} />
      <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
        {ROW_HEADINGS[row.id].charAt(0)}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-[10px] font-medium text-muted-foreground">{ROW_HEADINGS[row.id]}</p>
        <Slot value={row.title} barClassName="w-2/3" className="text-xs font-medium text-foreground" />
        <Slot value={row.lines[0]} barClassName="w-full" className="text-[11px] text-muted-foreground" />
        <Slot value={row.lines[1]} barClassName="w-4/5" className="text-[11px] text-muted-foreground" />
        <div className="flex flex-wrap gap-1">
          {skeletonTags ? (
            <>
              <Bar className="h-3.5 w-12" />
              <Bar className="h-3.5 w-9" />
            </>
          ) : (
            row.tags.map((tag) => (
              <Badge key={tag} variant="primary-light" size="sm" radius="full" className={REVEAL}>
                {tag}
              </Badge>
            ))
          )}
        </div>
      </div>
    </li>
  );
}

/** A mini app window that fills in as the onboarding learns about the company. Purely illustrative. */
function MockWindow({ preview }: { preview: Preview }) {
  const name = preview.name ?? "Su empresa";
  return (
    <div className="relative flex h-full overflow-hidden bg-muted">
      <div className="pointer-events-none flex w-[40rem] max-w-none shrink-0 translate-x-6 translate-y-8 select-none overflow-hidden rounded-xl border bg-background shadow-sm">
        <nav aria-hidden="true" className="flex w-12 shrink-0 flex-col items-center gap-3 border-e bg-muted/40 py-3">
          <CompanyAvatar name={name} size="sm" />
          {RAIL_ICONS.map((Icon, index) => (
            <Icon key={index} className={cn("size-4", index === 0 ? "text-foreground" : "text-muted-foreground/60")} />
          ))}
        </nav>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
            <Slot value={preview.name} barClassName="h-2.5 w-28" className="text-sm font-semibold text-foreground" />
            {preview.sector ? (
              <Badge variant="info-light" size="sm" radius="full" className={REVEAL}>
                {preview.sector}
              </Badge>
            ) : (
              <Bar className="h-4 w-16" />
            )}
          </header>
          <div className="flex items-center gap-1.5 px-3 pt-2.5">
            <div className="flex h-7 flex-1 items-center gap-1.5 rounded-md border px-2 text-[11px] text-muted-foreground">
              <SearchIcon className="size-3" />
              Buscar en {preview.name ?? "su empresa"}
            </div>
          </div>
          <div className="flex gap-1 overflow-hidden px-3 py-2.5">
            {FILTERS.map((filter, index) => (
              <Badge key={filter} variant={index === 0 ? "default" : "outline"} size="sm" radius="full">
                {filter}
              </Badge>
            ))}
          </div>
          <ul className="border-t">
            {preview.rows.map((row) => (
              <PreviewRowItem key={row.id} row={row} />
            ))}
          </ul>
        </div>
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-linear-to-l from-muted to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-muted to-transparent" />
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

/** The simple version for small screens: only what is known, as a list. */
function SummaryList({ preview }: { preview: Preview }) {
  const known = preview.rows.filter((row) => row.known);
  const place = [preview.sector, preview.city].filter(Boolean).join(", ");
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <CompanyAvatar name={preview.name ?? "Su empresa"} />
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-sm font-semibold">{preview.name ?? "Su empresa"}</p>
          <p className="truncate text-xs text-muted-foreground">{place || "Sector y ciudad por definir"}</p>
        </div>
      </div>
      {known.length === 0 && <p className="text-sm text-muted-foreground">A medida que responda, aquí verá cómo queda su empresa.</p>}
      {known.map((row) => (
        <Section key={row.id} title={ROW_HEADINGS[row.id]}>
          <p className="text-sm">{[row.title, ...row.lines].filter(Boolean).join(". ")}</p>
          {row.tags.length > 0 && (
            <ul className="flex flex-wrap gap-1">
              {row.tags.map((tag) => (
                <li key={tag}>
                  <Badge variant="outline">{tag}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Section>
      ))}
    </div>
  );
}

/** Live view of what the app knows about the company so far: the seed plus what the AI has gathered. */
export function ProfilePreview({ draft, variant = "window" }: { draft: OnboardingDraft; variant?: "window" | "list" }) {
  const preview = buildPreview(draft.seed, draft.patch);
  return variant === "window" ? <MockWindow preview={preview} /> : <SummaryList preview={preview} />;
}
