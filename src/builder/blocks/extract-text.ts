// Pulls a flat search-relevant string out of a block. Owned alongside
// the manifest registry because the per-kind branches mirror the
// manifest's data schemas — when a kind grows a new text-bearing field,
// add it here too.
//
// Used by the FTS5 indexer (search-sync) and the legacy in-memory
// scanner (search.ts) until the latter is retired.

import type { BlockEntity } from "@/builder/types/entity";

export function extractBlockText(block: BlockEntity): string {
  const data = (block.data ?? {}) as Record<string, unknown>;
  switch (block.kind) {
    case "text":
    case "paragraph":
      return String(data.markdown ?? "");
    case "heading":
      return String(data.text ?? "");
    case "blockquote":
      return [data.text, data.cite].filter(Boolean).join(" ");
    case "callout":
      return String(data.text ?? "");
    case "code-block":
      return String(data.code ?? "");
    case "list":
    case "bullet-list":
    case "numbered-list": {
      const items = Array.isArray(data.items) ? (data.items as unknown[]) : [];
      return items.map((i) => String(i)).join("\n");
    }
    case "checklist": {
      const items = Array.isArray(data.items) ? (data.items as unknown[]) : [];
      return items
        .map((i) =>
          i && typeof i === "object"
            ? String((i as Record<string, unknown>).text ?? "")
            : "",
        )
        .join("\n");
    }
    case "definition":
      return [data.term, data.definition].filter(Boolean).join(" — ");
    case "decision":
      return [data.question, data.decision, data.rationale]
        .filter(Boolean)
        .join(" ");
    case "persona":
      return [data.name, data.role].filter(Boolean).join(" ");
    case "user-story":
      return [data.as, data.want, data.soThat].filter(Boolean).join(" ");
    case "risk":
      return [data.risk, data.impact, data.mitigation]
        .filter(Boolean)
        .join(" ");
    case "metric":
      return [data.name, data.target, data.current].filter(Boolean).join(" ");
    case "figure":
      return [data.caption, data.alt].filter(Boolean).join(" ");
    case "link-card":
      return [data.title, data.description, data.url].filter(Boolean).join(" ");
    case "hero":
      return [data.title, data.subtitle, data.cta].filter(Boolean).join(" ");
    case "card-grid": {
      const cards = Array.isArray(data.cards) ? (data.cards as unknown[]) : [];
      return cards
        .map((c) =>
          c && typeof c === "object"
            ? [
                (c as Record<string, unknown>).title,
                (c as Record<string, unknown>).body,
                (c as Record<string, unknown>).label,
              ]
                .filter(Boolean)
                .map(String)
                .join(" ")
            : "",
        )
        .join("\n");
    }
    case "form": {
      const fields = Array.isArray(data.fields)
        ? (data.fields as unknown[])
        : [];
      return fields
        .map((f) =>
          f && typeof f === "object"
            ? [
                (f as Record<string, unknown>).label,
                (f as Record<string, unknown>).placeholder,
              ]
                .filter(Boolean)
                .map(String)
                .join(" ")
            : "",
        )
        .join("\n");
    }
    case "nav": {
      const items = Array.isArray(data.items) ? (data.items as unknown[]) : [];
      return items
        .map((i) =>
          i && typeof i === "object"
            ? String((i as Record<string, unknown>).label ?? "")
            : "",
        )
        .join(" ");
    }
    case "agent-step":
      return [data.role, JSON.stringify(data.spec ?? {})].join(" ");
    case "table": {
      const cols = (data.columns as string[] | undefined) ?? [];
      const rows = (data.rows as string[][] | undefined) ?? [];
      // Escape `|` inside cell values so GFM column separators are not broken.
      const escapeCell = (cell: string) => cell.replace(/\|/g, "\\|");
      const out: string[] = [];
      if (cols.length) out.push(`| ${cols.map(escapeCell).join(" | ")} |`);
      if (cols.length) out.push(`| ${cols.map(() => "---").join(" | ")} |`);
      for (const r of rows) {
        out.push(
          `| ${cols.map((_, i) => escapeCell(r[i] ?? "")).join(" | ")} |`,
        );
      }
      return out.join("\n");
    }
    default:
      return "";
  }
}
