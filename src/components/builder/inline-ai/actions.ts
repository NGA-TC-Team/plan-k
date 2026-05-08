// Inline AI action catalog. Each action compiles a system + user
// prompt pair from the selected block(s); the prompt is dispatched as
// a single user message into an ad-hoc chat session running in
// approval mode, so every result lands in the staging strip.
//
// Keep prompts pinned in this file — free-text composition lives in
// the chat panel, not here.

import { extractBlockText } from "@/builder/blocks/extract-text";
import type { BlockEntity } from "@/builder/types/entity";

export type InlineActionId =
  | "rewrite-shorter"
  | "rewrite-longer"
  | "rewrite-formal"
  | "rewrite-casual"
  | "translate-ko"
  | "translate-en"
  | "translate-ja"
  | "critique"
  | "generate-children";

export type InlineAction = {
  id: InlineActionId;
  group: "rewrite" | "translate" | "critique" | "generate";
  label: string;
  // Some actions only make sense for blocks with text content. The
  // menu hides the action when this returns false.
  available: (block: BlockEntity) => boolean;
  buildPrompt: (input: { block: BlockEntity; blockText: string }) => string;
};

const hasText = (block: BlockEntity): boolean => {
  return extractBlockText(block).trim().length > 0;
};

function rewritePrompt(direction: string) {
  return ({ block, blockText }: { block: BlockEntity; blockText: string }) =>
    `Rewrite the following ${block.kind} block to be ${direction}. Preserve the block's structure and emit a single UPDATE_BLOCK staged intent for block id "${block.id}" with the new data.

Original text:
"""
${blockText}
"""`;
}

function translatePrompt(targetLang: string, langName: string) {
  return ({ block, blockText }: { block: BlockEntity; blockText: string }) =>
    `Translate the following ${block.kind} block to ${langName} (${targetLang}). Keep numbers, code, and proper nouns unchanged. Emit a single UPDATE_BLOCK staged intent for block id "${block.id}" with the translated data.

Original text:
"""
${blockText}
"""`;
}

export const INLINE_ACTIONS: InlineAction[] = [
  {
    id: "rewrite-shorter",
    group: "rewrite",
    label: "Shorter",
    available: hasText,
    buildPrompt: rewritePrompt(
      "about half the length while keeping the key point",
    ),
  },
  {
    id: "rewrite-longer",
    group: "rewrite",
    label: "Longer",
    available: hasText,
    buildPrompt: rewritePrompt("about 1.5× the length with concrete detail"),
  },
  {
    id: "rewrite-formal",
    group: "rewrite",
    label: "More formal",
    available: hasText,
    buildPrompt: rewritePrompt("written in formal Korean (존댓말, 문어체)"),
  },
  {
    id: "rewrite-casual",
    group: "rewrite",
    label: "More casual",
    available: hasText,
    buildPrompt: rewritePrompt("written in casual Korean (반말, 구어체)"),
  },
  {
    id: "translate-ko",
    group: "translate",
    label: "Korean",
    available: hasText,
    buildPrompt: translatePrompt("ko", "Korean"),
  },
  {
    id: "translate-en",
    group: "translate",
    label: "English",
    available: hasText,
    buildPrompt: translatePrompt("en", "English"),
  },
  {
    id: "translate-ja",
    group: "translate",
    label: "Japanese",
    available: hasText,
    buildPrompt: translatePrompt("ja", "Japanese"),
  },
  {
    id: "critique",
    group: "critique",
    label: "Critique this block",
    available: hasText,
    buildPrompt: ({ block, blockText }) =>
      `Read the following ${block.kind} block and write a short critique (max 4 bullets) covering clarity, completeness, and risks. Emit one INSERT_BLOCK staged intent that adds a callout block (variant: "warn") as the next sibling of "${block.id}".

Original text:
"""
${blockText}
"""`,
  },
  {
    id: "generate-children",
    group: "generate",
    label: "Generate child blocks",
    available: (block) => {
      // Section-ish blocks make sense as parents — guard at the menu.
      const sectionish = ["section", "card-grid"];
      return sectionish.includes(block.kind);
    },
    buildPrompt: ({ block }) =>
      `Generate 3 detail blocks as children of "${block.id}" appropriate for a ${block.kind}. Emit one INSERT_BLOCK staged intent per child, using the parent's existing context and conventions.`,
  },
];

export function findAction(id: InlineActionId): InlineAction | undefined {
  return INLINE_ACTIONS.find((a) => a.id === id);
}
