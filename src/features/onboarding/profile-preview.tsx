import { Badge } from "@/components/reui/badge";
import { CompanyAvatar } from "@/components/shell/company-avatar";
import { buildConfirmValues } from "@/core/onboarding/confirm";
import type { OnboardingDraft } from "@/core/onboarding/draft";

const MAX_LISTED = 6;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

const listOf = (items: string[]) => (
  <ul className="flex flex-wrap gap-1">
    {items.slice(0, MAX_LISTED).map((item) => (
      <li key={item}>
        <Badge variant="outline">{item}</Badge>
      </li>
    ))}
    {items.length > MAX_LISTED && <li className="text-xs text-muted-foreground">y {items.length - MAX_LISTED} más</li>}
  </ul>
);

/** Live view of what the app knows about the company so far: the seed plus what the AI has gathered. */
export function ProfilePreview({ draft }: { draft: OnboardingDraft }) {
  const values = buildConfirmValues(draft.seed ?? { name: "" }, draft.patch);
  const terms = [...values.newsGroups.sector, ...values.newsGroups.regulation, ...values.newsGroups.operations];
  const hasNothingYet = !values.sector && !values.activity && values.competitors.length === 0 && terms.length === 0 && !values.target;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <CompanyAvatar name={values.name || "Su empresa"} />
        <div className="flex min-w-0 flex-col">
          <p className="truncate text-sm font-semibold">{values.name || "Su empresa"}</p>
          <p className="truncate text-xs text-muted-foreground">{[values.sector, values.city].filter(Boolean).join(", ") || "Sector y ciudad por definir"}</p>
        </div>
      </div>

      {values.nit ? (
        <p className="text-xs text-muted-foreground tabular-nums">NIT {values.nit}</p>
      ) : (
        <p className="text-xs text-muted-foreground">Sin NIT: Contratación pública y Competidores quedan sin datos.</p>
      )}

      {hasNothingYet && <p className="text-sm text-muted-foreground">A medida que responda, aquí verá cómo queda su empresa.</p>}
      {values.activity && (
        <Section title="Actividad">
          <p className="text-sm">{values.activity}</p>
        </Section>
      )}
      {values.competitors.length > 0 && <Section title="Competidores">{listOf(values.competitors.map((competitor) => competitor.name))}</Section>}
      {terms.length > 0 && <Section title="Búsquedas de noticias">{listOf(terms)}</Section>}
      {values.target && (
        <Section title="Meta">
          <p className="text-sm">{values.target}</p>
        </Section>
      )}
    </div>
  );
}
