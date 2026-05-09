import { diffLines } from "diff";
import { extractBlockText } from "@/builder/blocks/extract-text";
import type { BlockEntity } from "@/builder/types/entity";
import type { BlockTextDiff } from "./types";

/** Compute line-level diff between two text strings. */
export function diffBlockText(
  beforeText: string,
  afterText: string,
): BlockTextDiff["parts"] {
  const parts = diffLines(beforeText ?? "", afterText ?? "");
  return parts.map((p) => ({
    added: p.added,
    removed: p.removed,
    value: p.value,
  }));
}

/**
 * Extract text from a block for diff purposes.
 * Returns null if the block has no text-bearing field (e.g. pure image blocks).
 */
export function extractTextForDiff(block: BlockEntity): string | null {
  const text = extractBlockText(block);
  return text.length > 0 ? text : null;
}
