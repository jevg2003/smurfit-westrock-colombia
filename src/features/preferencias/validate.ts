import { z } from "zod";
import type { Thresholds } from "@/content/config/empresa";

export type ThresholdKey = keyof Thresholds;
export type ThresholdFields = Record<ThresholdKey, string>;
export type ThresholdErrors = Partial<Record<ThresholdKey, string>>;

export type Validation<T, E> = { ok: true; value: T } | { ok: false; errors: E };

interface Rule {
  /** Whole numbers only (days). */
  integer: boolean;
  max: number;
}

const RULES: Record<ThresholdKey, Rule> = {
  trmDailyMovePct: { integer: false, max: 50 },
  trmDailyAlertPct: { integer: false, max: 50 },
  contractExpiryWatchDays: { integer: true, max: 730 },
  contractExpiryAlertDays: { integer: true, max: 730 },
  competitorContractWindowDays: { integer: true, max: 365 },
};

/** Accepts a decimal comma ("1,5") as well as a point. */
export function parseNumber(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (normalized === "" || !/^-?(\d+\.?\d*|\.\d+)$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

/** Validates the threshold form. Returns every problem at once, one message per field. */
export function validateThresholds(fields: ThresholdFields): Validation<Thresholds, ThresholdErrors> {
  const errors: ThresholdErrors = {};
  const values: { -readonly [K in ThresholdKey]?: number } = {};

  for (const key of Object.keys(RULES) as ThresholdKey[]) {
    const rule = RULES[key];
    const raw = parseNumber(fields[key]);
    if (raw === null) {
      errors[key] = "Escribe un número.";
    } else if (raw <= 0) {
      errors[key] = "El valor debe ser mayor que cero.";
    } else if (rule.integer && !Number.isInteger(raw)) {
      errors[key] = "Usa un número entero de días.";
    } else if (raw > rule.max) {
      errors[key] = `El valor no puede pasar de ${rule.max}.`;
    } else {
      values[key] = raw;
    }
  }

  if (values.trmDailyMovePct !== undefined && values.trmDailyAlertPct !== undefined && !errors.trmDailyAlertPct) {
    if (values.trmDailyAlertPct < values.trmDailyMovePct) {
      errors.trmDailyAlertPct = "El umbral de alerta debe ser igual o mayor que el de vigilar.";
    }
  }
  if (values.contractExpiryWatchDays !== undefined && values.contractExpiryAlertDays !== undefined && !errors.contractExpiryAlertDays) {
    if (values.contractExpiryAlertDays > values.contractExpiryWatchDays) {
      errors.contractExpiryAlertDays = "Los días de alerta deben ser igual o menores que los de vigilar.";
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: values as { -readonly [K in ThresholdKey]: number } };
}

export const MAX_TERM_LENGTH = 80;
export const MAX_TERMS_PER_GROUP = 30;

/** One term per line. Blank lines and repeated terms are dropped. */
export function parseTerms(text: string): Validation<string[], string> {
  const terms = [...new Set(text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0))];
  if (terms.some((term) => term.length > MAX_TERM_LENGTH)) {
    return { ok: false, errors: `Cada término puede tener hasta ${MAX_TERM_LENGTH} caracteres.` };
  }
  if (terms.length > MAX_TERMS_PER_GROUP) {
    return { ok: false, errors: `Usa hasta ${MAX_TERMS_PER_GROUP} términos por grupo.` };
  }
  return { ok: true, value: terms };
}

/**
 * Schema the threshold form validates with (TanStack Form takes any standard schema). It wraps
 * `validateThresholds`, so the rules live in one place and every field reports its own message.
 */
export const thresholdsSchema = z
  .object({
    trmDailyMovePct: z.string(),
    trmDailyAlertPct: z.string(),
    contractExpiryWatchDays: z.string(),
    contractExpiryAlertDays: z.string(),
    competitorContractWindowDays: z.string(),
  })
  .superRefine((fields, ctx) => {
    const result = validateThresholds(fields);
    if (result.ok) return;
    for (const [key, message] of Object.entries(result.errors)) ctx.addIssue({ code: "custom", path: [key], message });
  });

/** One schema entry per news term group; each group's textarea is checked with `parseTerms`. */
export function termsSchema<Id extends string>(groupIds: readonly Id[]) {
  const group = z.string().superRefine((text, ctx) => {
    const result = parseTerms(text);
    if (!result.ok) ctx.addIssue({ code: "custom", message: result.errors });
  });
  return z.object(Object.fromEntries(groupIds.map((id) => [id, group])) as Record<Id, typeof group>);
}
