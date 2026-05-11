/**
 * block-macros.ts
 *
 * Shared macro-matching logic for empty paragraph blocks.
 * Matches a typed shortcut prefix and returns the target BlockKind + initial
 * data so the caller can dispatch a single UPDATE_BLOCK intent.
 *
 * NotionWriter retains its own private matchShortcut (→ WriterMode) because
 * its commit flow is insert-based, not update-based. The matching table below
 * mirrors that function exactly so both surfaces stay in sync.
 *
 * Non-goals: slash-menu, inline formatting, blocks other than paragraph.
 */

import type { BlockKind } from "@/builder/types/entity";

export type BlockMacroResult = {
  kind: BlockKind;
  data: Record<string, unknown>;
};

/**
 * Returns a BlockMacroResult when `input` matches a known shortcut prefix,
 * or null when no match is found.
 *
 * Matching rules (identical to NotionWriter's matchShortcut):
 *   "# "         → heading level 1
 *   "## "        → heading level 2
 *   "### "       → heading level 3
 *   "- " | "* "  → bullet-list
 *   /^\d+\.\s$/  → numbered-list
 *   "[] " | "[ ] " → checklist
 *   "> "         → blockquote
 *   "```"        → code-block
 */
export function matchBlockMacro(input: string): BlockMacroResult | null {
  if (input === "# ") {
    return { kind: "heading", data: { level: 1, text: "" } };
  }
  if (input === "## ") {
    return { kind: "heading", data: { level: 2, text: "" } };
  }
  if (input === "### ") {
    return { kind: "heading", data: { level: 3, text: "" } };
  }
  if (input === "- " || input === "* ") {
    return {
      kind: "bullet-list",
      data: { ordered: false, items: [""] },
    };
  }
  if (/^\d+\.\s$/.test(input)) {
    return {
      kind: "numbered-list",
      data: { ordered: true, items: [""] },
    };
  }
  if (input === "[] " || input === "[ ] ") {
    return {
      kind: "checklist",
      data: { items: [{ text: "", done: false }] },
    };
  }
  if (input === "> ") {
    return {
      kind: "blockquote",
      data: { text: "", cite: "" },
    };
  }
  if (input === "```") {
    return {
      kind: "code-block",
      data: { language: "ts", code: "", filename: "" },
    };
  }
  return null;
}
