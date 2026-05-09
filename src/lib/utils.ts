import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a boolean query-string parameter with a caller-supplied default.
 *
 * Rules (forgiving, consistent with the existing route/page pattern):
 *   - null / undefined → defaultVal
 *   - Array → inspect first element; empty array → defaultVal
 *   - "false" (case-sensitive) → false
 *   - anything else (including "", "0", "true") → true
 */
export function parseBoolParam(
  raw: string | string[] | null | undefined,
  defaultVal: boolean,
): boolean {
  if (raw === null || raw === undefined) return defaultVal;
  const val = Array.isArray(raw) ? raw[0] : raw;
  if (val === undefined) return defaultVal;
  return val !== "false";
}
