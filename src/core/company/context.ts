import { z } from "zod";
import type { TermGroup } from "../text/match";
import { buildTermGroup } from "../text/term-groups";
import {
  competitorSchema,
  deriveNewsGroupDefinitions,
  goalsSchema,
  hasContextTerms,
  type CompanyProfile,
  type NewsTermGroup,
} from "./profile";

/** Context rules of a group: the Colombian context words only where the group needs them, and the shared exclusions. */
export function contextRulesOf(profile: Pick<CompanyProfile, "colombiaContextWords" | "excludeWords">, group: Pick<NewsTermGroup, "contextTerms">) {
  return { requireAny: hasContextTerms(group) ? [...profile.colombiaContextWords] : [], excludeAny: [...profile.excludeWords] };
}

/** The matcher groups of a profile, with the context and exclusion words it defines. Pure. */
export function buildProfileTermGroups(profile: Pick<CompanyProfile, "newsGroups" | "colombiaContextWords" | "excludeWords">): TermGroup[] {
  return deriveNewsGroupDefinitions(profile).map((group) => buildTermGroup(group, contextRulesOf(profile, group)));
}

const text = (max: number) => z.string().trim().min(1).max(max);

const termSpecSchema = z.union([text(120), z.object({ term: text(120), requireAny: z.array(text(120)).max(40) })]);

/** A term group as the matcher uses it. The server accepts it from the client, so every size is bounded. */
export const termGroupSchema = z.object({
  id: text(40),
  label: text(80),
  terms: z.array(termSpecSchema).max(40),
  excludeAny: z.array(text(120)).max(40).optional(),
});

export const regulationTermsSchema = z.object({
  include: z.array(text(120)).max(60),
  exclude: z.array(text(120)).max(40),
});

/**
 * What the server may know about the company. The browser holds the profile (localStorage), so the server
 * receives only this subset with every request and must treat it as untrusted data.
 */
export const companyContextSchema = z.object({
  name: text(120),
  nit: z.string().trim().regex(/^\d{5,12}$/).optional(),
  activity: z.string().trim().max(1000).optional(),
  competitors: z.array(competitorSchema).max(20),
  termGroups: z.array(termGroupSchema).max(8),
  regulation: regulationTermsSchema,
  goals: goalsSchema.optional(),
});

export type CompanyContext = z.infer<typeof companyContextSchema>;

/** The subset of a profile that travels to the server. */
export function buildCompanyContext(profile: CompanyProfile): CompanyContext {
  return {
    name: profile.name,
    ...(profile.nit ? { nit: profile.nit } : {}),
    ...(profile.activity ? { activity: profile.activity } : {}),
    competitors: profile.competitors,
    termGroups: buildProfileTermGroups(profile).map((group) => ({
      id: group.id,
      label: group.label,
      terms: group.terms.map((spec) => (typeof spec === "string" ? spec : { term: spec.term, requireAny: [...spec.requireAny] })),
      ...(group.excludeAny ? { excludeAny: [...group.excludeAny] } : {}),
    })),
    regulation: { include: profile.regulationKeywords, exclude: profile.regulationExcludeKeywords },
    goals: profile.goals,
  };
}
