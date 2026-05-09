/**
 * Determines whether a given hour falls within a "dark window"
 * defined by [start, end) — wrapping midnight if start > end.
 *
 * Examples:
 *   isInDarkWindow(20, 18, 7) → true  (18 ≤ 20, wraps past midnight)
 *   isInDarkWindow(12, 18, 7) → false
 *   isInDarkWindow(0,  18, 7) → true  (wrap: 0 < 7)
 *   isInDarkWindow(7,  18, 7) → false (end is exclusive)
 *   isInDarkWindow(15,  9,17) → true  (non-wrap: 9 ≤ 15 < 17)
 */
export function isInDarkWindow(
  hour: number,
  start: number,
  end: number,
): boolean {
  if (start === end) return false;
  if (start < end) {
    // Non-wrapping window  e.g. 9–17
    return hour >= start && hour < end;
  }
  // Wrapping window  e.g. 18–7 (crosses midnight)
  return hour >= start || hour < end;
}
