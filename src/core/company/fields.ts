import "@/lib/zod-config";
import { z } from "zod";

/**
 * Field-level schemas of a company, defined once. The stored profile, the onboarding requests and every form
 * build their schemas from these, so a limit or a message changes in one place.
 */
export const NAME_MAX = 120;
export const CITY_MAX = 80;
export const SECTOR_MAX = 120;
export const ACTIVITY_MAX = 1000;
export const GOAL_TEXT_MAX = 2000;
export const PRIORITY_MAX = 200;
export const TERM_MAX = 120;
export const COMPETITORS_MAX = 20;
export const PRIORITIES_MAX = 10;
/** Terms of one news group, and context or excluded words of one list. */
export const TERMS_PER_GROUP_MAX = 40;
export const REGULATION_KEYWORDS_MAX = 60;

const tooLong = (max: number) => `Use ${max} caracteres como máximo.`;

/** A required short text. */
export const requiredText = (max: number, required = "Este dato es obligatorio.") => z.string().trim().min(1, required).max(max, tooLong(max));
/** A text that may be empty. */
export const freeText = (max: number) => z.string().trim().max(max, tooLong(max));

export const nameSchema = requiredText(NAME_MAX, "Escriba el nombre de la empresa.");
export const citySchema = freeText(CITY_MAX);
export const sectorSchema = freeText(SECTOR_MAX);
export const activitySchema = freeText(ACTIVITY_MAX);
export const goalTextSchema = freeText(GOAL_TEXT_MAX);
export const competitorNameSchema = requiredText(NAME_MAX, "Escriba el nombre del competidor.");

/** One search term, context word or excluded word. */
export const termSchema = requiredText(TERM_MAX);
/** A list of terms: each one up to `TERM_MAX` characters. */
export const termList = (maxItems: number = TERMS_PER_GROUP_MAX) => z.array(termSchema).max(maxItems, `Use ${maxItems} términos como máximo.`);
export const prioritySchema = requiredText(PRIORITY_MAX);
export const prioritiesSchema = z.array(prioritySchema).max(PRIORITIES_MAX, `Use ${PRIORITIES_MAX} prioridades como máximo.`);
