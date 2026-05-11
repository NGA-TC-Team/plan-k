// Serializes a section (and its descendant block tree) into a GFM markdown
// string. Used by the BacklogSheet "콘텐츠 복사하기" action.
//
// Block kinds mirror extract-text.ts — when a kind grows new fields, keep
// both files in sync.

import {
  extractBlockText,
  serializeTableBlock,
} from "@/builder/blocks/extract-text";
import type { BlockEntity } from "@/builder/types/entity";
import type { AppState } from "@/builder/types/state";

/** Recursively serializes a block to markdown.
 *  Falls back to extractBlockText for unsupported / future kinds. */
function blockToMarkdown(
  block: BlockEntity,
  state: AppState,
  depth: number,
): string {
  const data = (block.data ?? {}) as Record<string, unknown>;

  switch (block.kind) {
    case "text":
    case "paragraph":
      return String(data.markdown ?? "");

    case "heading": {
      const level = Math.min(Math.max(Number(data.level ?? 2), 1), 6);
      const hashes = "#".repeat(level);
      return `${hashes} ${String(data.text ?? "")}`;
    }

    case "bullet-list": {
      const items = Array.isArray(data.items) ? (data.items as unknown[]) : [];
      if (items.length === 0) return "";
      return items.map((i) => `- ${String(i)}`).join("\n");
    }

    case "list":
    case "numbered-list": {
      const items = Array.isArray(data.items) ? (data.items as unknown[]) : [];
      if (items.length === 0) return "";
      return items.map((i, idx) => `${idx + 1}. ${String(i)}`).join("\n");
    }

    case "checklist": {
      const items = Array.isArray(data.items) ? (data.items as unknown[]) : [];
      if (items.length === 0) return "";
      return items
        .map((i) => {
          if (i && typeof i === "object") {
            const entry = i as Record<string, unknown>;
            const checked = Boolean(entry.checked);
            const text = String(entry.text ?? "");
            return checked ? `- [x] ${text}` : `- [ ] ${text}`;
          }
          return `- [ ] ${String(i)}`;
        })
        .join("\n");
    }

    case "blockquote": {
      const text = String(data.text ?? "");
      if (!text) return "";
      // Prefix each line with `> ` for multi-line quotes.
      return text
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    }

    case "code-block": {
      const language = String(data.language ?? "");
      const code = String(data.code ?? "");
      return `\`\`\`${language}\n${code}\n\`\`\``;
    }

    case "table":
      return serializeTableBlock(block);

    case "link-card": {
      const title = String(data.title ?? "").trim();
      const url = String(data.url ?? "").trim();
      if (!url) return title || "";
      return title ? `[${title}](${url})` : `<${url}>`;
    }

    case "math-block": {
      const tex = String(data.tex ?? "").trim();
      return `$$\n${tex}\n$$`;
    }

    case "figure": {
      const alt = String(data.alt ?? data.caption ?? "").trim();
      const imageRef = String(data.imageRef ?? data.src ?? "").trim();
      const ref = imageRef || "<placeholder>";
      return `![${alt}](${ref})`;
    }

    default: {
      // For unrecognized / future kinds, fall back to plain-text extraction.
      const fallback = extractBlockText(block);
      // Recurse into children if any — composite blocks may have sub-blocks
      // tracked in state.children.
      const childIds = state.children[block.id] ?? [];
      const childLines = childIds
        .map((id) => state.blocks[id])
        .filter((b): b is BlockEntity => Boolean(b))
        .map((b) => blockToMarkdown(b, state, depth + 1))
        .filter(Boolean);
      return [fallback, ...childLines].filter(Boolean).join("\n");
    }
  }
}

/** Converts a section and its immediate block children to GFM markdown.
 *
 * Output shape:
 * ```
 * # Section title
 *
 * <block 1>
 *
 * <block 2>
 * ```
 */
export function sectionToMarkdown(state: AppState, sectionId: string): string {
  const section = state.sections[sectionId];
  if (!section) return "";

  const childIds = state.children[sectionId] ?? [];
  const childBlocks = childIds
    .map((id) => state.blocks[id])
    .filter((b): b is BlockEntity => Boolean(b));

  const parts: string[] = [`# ${section.title}`];

  for (const block of childBlocks) {
    const md = blockToMarkdown(block, state, 0);
    if (md.trim()) parts.push(md);
  }

  // Join with a single blank line between each part.
  return parts.join("\n\n");
}
