// Shared field-validation helpers.
//
// Convention across the app: a BLANK field is never invalid — optional fields
// are skippable, and required-ness is enforced separately (disabled submit /
// `required` attributes). These helpers only flag values that are present but
// wrong, so the UI can turn the field red (global `.invalid` class in app.css)
// and block the submit until the value is fixed or cleared.
import { parseDOB } from '../utils';

/** Parse a money input ("$1,200.50" → 1200.5). Blank → null. */
export function cleanAmount(raw: string): number | null {
  const trimmed = String(raw ?? '').replace(/[$,\s]/g, '');
  if (trimmed === '') return null;
  const n = parseFloat(trimmed);
  return Number.isFinite(n) ? n : NaN;
}

/** True when a money input holds something that isn't a positive amount. */
export function amountInvalid(raw: string): boolean {
  const n = cleanAmount(raw);
  if (n === null) return false;
  return !Number.isFinite(n) || n <= 0;
}

/**
 * True when a numeric value is present but outside [min, max].
 * Accepts the string/number/null soup that `bind:value` on number inputs
 * produces (blank → '' or null, unparsable text → null).
 */
export function numberInvalid(
  v: number | string | null | undefined,
  min: number,
  max: number,
): boolean {
  if (v === null || v === undefined || v === '') return false;
  const n = typeof v === 'number' ? v : parseFloat(v);
  if (!Number.isFinite(n)) return true;
  return n < min || n > max;
}

/** True when a yyyy-mm-dd string is present but not a real calendar date. */
export function dateInvalid(s: string, allowFuture = true): boolean {
  if (!s) return false;
  return parseDOB(s, allowFuture) === null;
}

/**
 * True when a present date falls outside [min, max] (each bound optional,
 * yyyy-mm-dd — the format compares lexicographically). Malformed dates are
 * covered by dateInvalid; this only checks the range.
 */
export function dateOutOfRange(s: string, min?: string, max?: string): boolean {
  if (!s || parseDOB(s, true) === null) return false;
  if (min && s < min) return true;
  if (max && s > max) return true;
  return false;
}

/**
 * True when a birthdate input is present but unusable: malformed, a future
 * date, or before 1900 (parseDOB enforces all three).
 */
export function dobInvalid(s: string): boolean {
  if (!s) return false;
  return parseDOB(s, false) === null;
}
