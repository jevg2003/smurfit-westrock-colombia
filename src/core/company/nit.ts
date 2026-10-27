import "@/lib/zod-config";
import { z } from "zod";

/** Colombian NIT and cédula numbers: 5 to 10 digits, without the verification digit (DV). */
export const NIT_MIN_DIGITS = 5;
export const NIT_MAX_DIGITS = 10;

const LENGTH_MESSAGE = `El NIT debe tener entre ${NIT_MIN_DIGITS} y ${NIT_MAX_DIGITS} dígitos.`;

/** DIAN weights, applied from the rightmost digit. */
const DV_WEIGHTS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71] as const;

/** Verification digit of a NIT by the DIAN modulo-11 algorithm. `digits` must hold digits only. */
export function computeNitDv(digits: string): number {
  let sum = 0;
  for (let index = 0; index < digits.length; index += 1) {
    const weight = DV_WEIGHTS[index];
    if (weight === undefined) break;
    sum += Number(digits[digits.length - 1 - index]) * weight;
  }
  const remainder = sum % 11;
  return remainder > 1 ? 11 - remainder : remainder;
}

/** "900123456" becomes "900.123.456". */
export const formatNit = (digits: string): string => digits.replace(/\B(?=(\d{3})+$)/g, ".");

/** "900123456" becomes "900.123.456-8". */
export const formatNitWithDv = (digits: string): string => `${formatNit(digits)}-${computeNitDv(digits)}`;

export interface ParsedNit {
  digits: string;
  /** The verification digit written after a dash, when there was one. */
  dv?: number;
}

/** Reads a NIT written in any format: dots, spaces, letters and a trailing "-DV" are handled. */
export function parseNit(raw: string): ParsedNit {
  const trimmed = raw.trim();
  const dash = trimmed.lastIndexOf("-");
  const tail = dash >= 0 ? trimmed.slice(dash + 1).replace(/\D+/g, "") : "";
  const hasDv = dash >= 0 && tail.length === 1;
  const body = hasDv ? trimmed.slice(0, dash) : trimmed;
  const digits = body.replace(/\D+/g, "");
  return hasDv ? { digits, dv: Number(tail) } : { digits };
}

/** Digits of a NIT written in any format ("900.123.456-7" becomes "900123456"), or undefined when there are none. */
export function nitOf(raw: string): string | undefined {
  const { digits } = parseNit(raw);
  return digits === "" ? undefined : digits;
}

/** NIT as stored and as SECOP expects it: digits only, no dots and no verification digit. */
export const nitDigitsSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, "El NIT lleva solo dígitos.")
  .min(NIT_MIN_DIGITS, LENGTH_MESSAGE)
  .max(NIT_MAX_DIGITS, LENGTH_MESSAGE);

/**
 * NIT as the form field holds it: the digits, plus "-DV" when the user pasted a number with its verification
 * digit. A pasted digit that does not match the computed one is an error.
 */
export const nitInputSchema = z.string().trim().superRefine((raw, ctx) => {
  const { digits, dv } = parseNit(raw);
  if (digits.length < NIT_MIN_DIGITS || digits.length > NIT_MAX_DIGITS) {
    ctx.addIssue({ code: "custom", message: LENGTH_MESSAGE });
    return;
  }
  const expected = computeNitDv(digits);
  if (dv !== undefined && dv !== expected) {
    ctx.addIssue({ code: "custom", message: `El dígito de verificación no coincide: para este NIT es ${expected}.` });
  }
});

/** The NIT field of a form where the number is optional: empty is allowed. */
export const optionalNitInputSchema = z.union([z.literal(""), nitInputSchema]);
