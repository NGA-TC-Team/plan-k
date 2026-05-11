/**
 * Pure paste-routing function.
 *
 * Categorises clipboard text as a standalone URL, a markdown table, or plain text.
 * Math-block routing will be added in PR-4.
 */

export type PasteResult =
  | { kind: "url"; url: string }
  | { kind: "table"; columns: string[]; rows: string[][] }
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
 * Table criteria (checked before URL):
 *  - First line AND second line both start+end with `|`
 *  - Second line is an alignment row: every cell contains only `-`, `:`, space
 *  - Returns { kind: "table", columns, rows } — alignment row excluded from data.
 *  - Asymmetric rows are padded with empty strings / excess cells are truncated.
 *
 * Everything else is "text".
 */
export function routePaste(text: string): PasteResult {
  const trimmed = text.trim();

  // ── Markdown table detection (takes priority over URL check) ────────────────
  const tableResult = tryParseMarkdownTable(trimmed);
  if (tableResult) return tableResult;

  // ── URL detection ────────────────────────────────────────────────────────────
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

// ── Internal: markdown table parser ──────────────────────────────────────────

/** Regex that matches a markdown alignment cell: only `-`, `:`, and spaces. */
const ALIGNMENT_CELL_RE = /^[\s\-:]+$/;

/**
 * Split a markdown table row into trimmed cell strings.
 * Strips the leading and trailing `|` before splitting.
 */
function splitTableRow(line: string): string[] {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

/**
 * Attempt to parse `text` as a GitHub-Flavored Markdown table.
 * Returns `{ kind: "table", columns, rows }` or `null` if not a table.
 */
function tryParseMarkdownTable(
  text: string,
): Extract<PasteResult, { kind: "table" }> | null {
  const lines = text.split(/\r?\n/);

  // Need at least 2 lines: header + alignment row.
  if (lines.length < 2) return null;

  const headerLine = lines[0].trim();
  const alignLine = lines[1].trim();

  // Both must start and end with `|`.
  if (!headerLine.startsWith("|") || !headerLine.endsWith("|")) return null;
  if (!alignLine.startsWith("|") || !alignLine.endsWith("|")) return null;

  // Alignment row: every cell must match `ALIGNMENT_CELL_RE`.
  const alignCells = splitTableRow(alignLine);
  if (alignCells.length === 0) return null;
  if (!alignCells.every((c) => ALIGNMENT_CELL_RE.test(c))) return null;

  const columns = splitTableRow(headerLine);
  const colCount = columns.length;

  // Parse data rows — stop on first non-table line.
  const rows: string[][] = [];
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith("|") || !line.endsWith("|")) break;
    const cells = splitTableRow(line);
    // Pad short rows / truncate long rows to align with header.
    const normalized: string[] = Array.from({ length: colCount }, (_, ci) =>
      ci < cells.length ? (cells[ci] ?? "") : "",
    );
    rows.push(normalized);
  }

  // Header-only table is valid (zero data rows).
  return { kind: "table", columns, rows };
}
