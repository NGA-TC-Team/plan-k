/**
 * Shared parsing utilities for inspector fields that accept comma-separated
 * numeric strings (e.g. chart series data, KPI sparklines).
 *
 * These helpers are pure functions with no side-effects. They are intentionally
 * lenient on input: invalid tokens are silently dropped rather than throwing,
 * because inspector fields should not crash the editor on partial input.
 */

/**
 * Parses a comma-separated string of numbers into a `number[]`.
 *
 * Robustness contract:
 * - null / undefined → []
 * - empty string or whitespace-only → []
 * - non-numeric tokens (including empty tokens from trailing commas) → skipped
 * - NaN-producing parses (e.g. "abc") → skipped
 */
export function parseNumberCsv(input: string | null | undefined): number[] {
  if (input == null || input.trim() === "") return [];
  return input
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token !== "")
    .map(Number)
    .filter((n) => !Number.isNaN(n) && Number.isFinite(n));
}

/**
 * Parses a comma-separated string of arbitrary text tokens into a `string[]`.
 *
 * Robustness contract:
 * - null / undefined → []
 * - empty string or whitespace-only → []
 * - empty tokens from trailing/leading commas → dropped
 */
export function parseStringCsv(input: string | null | undefined): string[] {
  if (input == null || input.trim() === "") return [];
  return input
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token !== "");
}

/**
 * Formats a `number[]` back to a comma-separated string for display in
 * inspector text fields.
 *
 * - Empty array → ""
 * - Numbers are rendered as-is (no locale formatting — keeps round-trip stable)
 */
export function formatNumberCsv(arr: number[]): string {
  if (arr.length === 0) return "";
  return arr.join(", ");
}
