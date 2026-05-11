/**
 * Pure paste-routing function.
 *
 * Categorises clipboard text as either a standalone URL or plain text.
 * Table and math-block routing will be added in PR-2/PR-4.
 */

export type PasteResult =
  | { kind: "url"; url: string }
  | { kind: "text"; text: string };

/**
 * Route a pasted string to its semantic kind.
 *
 * URL criteria:
 *  - Trimmed to a single non-empty line (no embedded newlines after trim)
 *  - Starts with "https://" or "http://"
 *  - Parses successfully with the `URL` constructor
 *  - Resolved hostname is non-empty
 *  - URL length ≤ 2048 characters (boundary guard)
 *
 * Everything else is "text".
 */
export function routePaste(text: string): PasteResult {
  const trimmed = text.trim();

  // Must start with a recognised scheme.
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    // Must be a single line — no newline characters after trim.
    if (!/\n/.test(trimmed) && !/\r/.test(trimmed)) {
      // Boundary: refuse excessively long URLs.
      if (trimmed.length <= 2048) {
        try {
          const parsed = new URL(trimmed);
          if (parsed.hostname.length > 0) {
            return { kind: "url", url: trimmed };
          }
        } catch {
          // Malformed URL → fall through to text.
        }
      }
    }
  }

  return { kind: "text", text };
}
