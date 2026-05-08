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
  // True when the action makes sense applied to N>1 blocks at once.
  // Generate-children only takes one parent at a time; everything else
  // is bulk-friendly.
  bulkable: boolean;
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
    bulkable: true,
    buildPrompt: rewritePrompt(
      "about half the length while keeping the key point",
    ),
  },
  {
    id: "rewrite-longer",
    group: "rewrite",
    label: "Longer",
    available: hasText,
    bulkable: true,
    buildPrompt: rewritePrompt("about 1.5× the length with concrete detail"),
  },
  {
    id: "rewrite-formal",
    group: "rewrite",
    label: "More formal",
    available: hasText,
    bulkable: true,
    buildPrompt: rewritePrompt("written in formal Korean (존댓말, 문어체)"),
  },
  {
    id: "rewrite-casual",
    group: "rewrite",
    label: "More casual",
    available: hasText,
    bulkable: true,
    buildPrompt: rewritePrompt("written in casual Korean (반말, 구어체)"),
  },
  {
    id: "translate-ko",
    group: "translate",
    label: "Korean",
    available: hasText,
    bulkable: true,
    buildPrompt: translatePrompt("ko", "Korean"),
  },
  {
    id: "translate-en",
    group: "translate",
    label: "English",
    available: hasText,
    bulkable: true,
    buildPrompt: translatePrompt("en", "English"),
  },
  {
    id: "translate-ja",
    group: "translate",
    label: "Japanese",
    available: hasText,
    bulkable: true,
    buildPrompt: translatePrompt("ja", "Japanese"),
  },
  {
    id: "critique",
    group: "critique",
    label: "Critique this block",
    available: hasText,
    bulkable: true,
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
    bulkable: false,
    buildPrompt: ({ block }) =>
      `Generate 3 detail blocks as children of "${block.id}" appropriate for a ${block.kind}. Emit one INSERT_BLOCK staged intent per child, using the parent's existing context and conventions.`,
  },
];

// Composes a single user message that asks the runner to apply
// `action` to every block in `blocks`. The runner emits one staged
// intent per block so the user can apply / reject them
// independently from the staging drawer.
export function buildBulkPrompt(
  action: InlineAction,
  blocks: { block: BlockEntity; blockText: string }[],
): string {
  const perBlock = blocks
    .map(
      ({ block, blockText }, i) =>
        `--- block ${i + 1} of ${blocks.length} (id="${block.id}", kind=${block.kind}) ---\n"""\n${blockText}\n"""`,
    )
    .join("\n\n");
  return `Apply the "${action.label}" ${action.group} action to each of the ${blocks.length} blocks below independently. For every block, emit a separate staged intent following the same shape used for single-block runs. Preserve each block's structure.

${perBlock}`;
}

export function findAction(id: InlineActionId): InlineAction | undefined {
  return INLINE_ACTIONS.find((a) => a.id === id);
}
