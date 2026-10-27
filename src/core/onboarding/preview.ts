import type { OnboardingSeed, ProfilePatch } from "./schemas";

export type PreviewRowId = "activity" | "competitors" | "news" | "regulation" | "goals";

/** One row of the live summary. A null text is still unknown and renders as a skeleton bar. */
export interface PreviewRow {
  id: PreviewRowId;
  title: string | null;
  lines: [string | null, string | null];
  tags: string[];
  /** Whether anything about this row is known yet. */
  known: boolean;
}

export interface Preview {
  name: string | null;
  city: string | null;
  sector: string | null;
  rows: PreviewRow[];
}

const LISTED_TAGS = 3;
const LISTED_LINE_ITEMS = 3;

const clean = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};
const cleanAll = (values: readonly string[] | undefined): string[] => (values ?? []).map((value) => value.trim()).filter((value) => value !== "");
const joined = (values: string[]): string | null => (values.length > 0 ? values.join(", ") : null);

function row(id: PreviewRowId, title: string | null, lines: [string | null, string | null], tags: string[]): PreviewRow {
  return { id, title, lines, tags, known: title !== null || lines.some((line) => line !== null) || tags.length > 0 };
}

/** What the live summary shows for the seed and the proposal gathered so far, in the order of the rows. */
export function buildPreview(seed: OnboardingSeed | null, patch: ProfilePatch): Preview {
  const competitors = patch.competitors ?? [];
  const names = cleanAll(competitors.map((competitor) => competitor.name));
  const withNit = competitors.filter((competitor) => competitor.nit).length;

  const sectorTerms = cleanAll(patch.newsGroups?.sector.terms);
  const operationTerms = cleanAll(patch.newsGroups?.operations.terms);

  const regulationItems = [...cleanAll(patch.newsGroups?.regulation.terms), ...cleanAll(patch.regulationKeywords)];

  const goalTexts = [clean(patch.goals?.target), clean(patch.goals?.currentSituation)].filter((text): text is string => text !== null);
  const priorities = cleanAll(patch.goals?.priorities);

  return {
    name: clean(seed?.name),
    city: clean(seed?.city) ?? clean(patch.city),
    sector: clean(patch.sector),
    rows: [
      row("activity", clean(patch.activity), [null, null], []),
      row("competitors", names[0] ?? null, [joined(names.slice(1)), withNit > 0 ? `${withNit} con NIT para consultar contratos` : null], names.slice(0, LISTED_TAGS)),
      row("news", sectorTerms[0] ?? null, [joined(sectorTerms.slice(1, 1 + LISTED_LINE_ITEMS)), joined(operationTerms)], sectorTerms.slice(0, LISTED_TAGS)),
      row("regulation", regulationItems[0] ?? null, [joined(regulationItems.slice(1, 1 + LISTED_LINE_ITEMS)), null], regulationItems.slice(0, LISTED_TAGS)),
      row("goals", goalTexts[0] ?? null, [goalTexts[1] ?? null, null], priorities.slice(0, LISTED_TAGS)),
    ],
  };
}
