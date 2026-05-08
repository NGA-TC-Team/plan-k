import type { BlockEntity } from "./types/entity";
import type { Intent } from "./types/intent";
import type { AppState } from "./types/state";

// In-memory clipboard payload. Lives in module scope so paste survives
// across canvases inside the same tab. Cross-tab/system paste is out of
// scope for v1 (no DataTransfer fallback yet).

export type ClipboardNode = {
  block: BlockEntity;
  children: ClipboardNode[];
};

export type ClipboardPayload = {
  version: 1;
  origin: string;
  copiedAt: number;
  // Roots are sibling-ordered as they appeared in the source plan.
  roots: ClipboardNode[];
};

let CLIPBOARD: ClipboardPayload | null = null;

export function getClipboard(): ClipboardPayload | null {
  return CLIPBOARD;
}

export function setClipboard(payload: ClipboardPayload | null): void {
  CLIPBOARD = payload;
}

// ──────────────────────────────────────────────────────────────────
// Serialize
// ──────────────────────────────────────────────────────────────────

function serializeNode(state: AppState, blockId: string): ClipboardNode | null {
  const block = state.blocks[blockId];
  if (!block) return null;
  const childIds = state.children[blockId] ?? [];
  const children: ClipboardNode[] = [];
  for (const cid of childIds) {
    const node = serializeNode(state, cid);
    if (node) children.push(node);
  }
  // Deep-clone to break any references into live state.
  return {
    block: structuredClone(block),
    children,
  };
}

/**
 * Produce a clipboard payload from the given block ids. When two of the
 * provided ids are ancestor/descendant, the descendant is dropped — only
 * top-level roots are kept so paste reproduces the same tree once.
 *
 * Sibling order matches the order each root appears under its parent.
 */
export function serializeBlocks(
  state: AppState,
  ids: string[],
  origin: string,
): ClipboardPayload | null {
  if (ids.length === 0) return null;
  const idSet = new Set(ids);

  // Filter out ids whose ancestor is also in the set (descendants).
  const tops = ids.filter((id) => {
    let cursor: string | undefined = state.blocks[id]?.parentId;
    while (cursor) {
      if (idSet.has(cursor)) return false;
      cursor = state.blocks[cursor]?.parentId;
    }
    return true;
  });
  if (tops.length === 0) return null;

  // Group tops by their parent so we can sort each group by sibling order.
  const byParent = new Map<string, string[]>();
  for (const id of tops) {
    const parentId = state.blocks[id]?.parentId;
    if (!parentId) continue;
    const list = byParent.get(parentId) ?? [];
    list.push(id);
    byParent.set(parentId, list);
  }

  const ordered: string[] = [];
  for (const [parentId, group] of byParent) {
    const siblings = state.children[parentId] ?? [];
    const idx = new Map(siblings.map((sid, i) => [sid, i]));
    group.sort((a, b) => (idx.get(a) ?? 0) - (idx.get(b) ?? 0));
    ordered.push(...group);
  }

  const roots: ClipboardNode[] = [];
  for (const id of ordered) {
    const node = serializeNode(state, id);
    if (node) roots.push(node);
  }
  if (roots.length === 0) return null;

  return {
    version: 1,
    origin,
    copiedAt: Date.now(),
    roots,
  };
}

// ──────────────────────────────────────────────────────────────────
// Deserialize → INSERT_BLOCK intents
// ──────────────────────────────────────────────────────────────────

export type IdGen = () => string;

function remapNode(
  node: ClipboardNode,
  parentId: string,
  newId: IdGen,
  out: Intent[],
  startIndex: number,
): number {
  const id = newId();
  const block: BlockEntity = {
    ...node.block,
    id,
    parentId,
  };
  out.push({
    type: "INSERT_BLOCK",
    parentId,
    block,
    index: startIndex,
  });
  let nextChildIndex = 0;
  for (const child of node.children) {
    nextChildIndex = remapNode(child, id, newId, out, nextChildIndex);
  }
  return startIndex + 1;
}

/**
 * Convert a clipboard payload into a sequence of INSERT_BLOCK intents that
 * reconstruct the subtree under `targetParentId`, starting at `targetIndex`.
 *
 * Every block id is regenerated so cross-plan paste is safe and so a paste
 * of the same payload twice doesn't collide. `parentId` of each cloned
 * block is rewritten to its new parent.
 */
export function intentsForPaste(
  payload: ClipboardPayload,
  targetParentId: string,
  targetIndex: number,
  newId: IdGen,
): Intent[] {
  const out: Intent[] = [];
  let cursor = targetIndex;
  for (const root of payload.roots) {
    cursor = remapNode(root, targetParentId, newId, out, cursor);
  }
  return out;
}
