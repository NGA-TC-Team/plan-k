import { isStrictlyGreater } from "../lamport";
import type { BlockContext } from "../types/entity";
import type { IntentLogEntry } from "../types/intent";
import type { AppState, DecideOutcome, EntityMeta } from "../types/state";

export function decideStructure(
  state: AppState,
  entry: IntentLogEntry,
): DecideOutcome | null {
  const { intent } = entry;
  switch (intent.type) {
    case "INSERT_BLOCK": {
      if (!parentExists(state, intent.parentId)) {
        return { ok: false, reason: "NOT_FOUND" };
      }
      if (intent.parentId === intent.block.id) {
        return { ok: false, reason: "CYCLIC_MOVE" };
      }
      if (
        intent.block.id in state.blocks &&
        isDescendant(state, intent.parentId, intent.block.id)
      ) {
        return { ok: false, reason: "CYCLIC_MOVE" };
      }
      const desiredContext =
        intent.block.context ?? inferContextForParent(state, intent.parentId);
      if (!validateParentForContext(state, intent.parentId, desiredContext)) {
        return { ok: false, reason: "WRONG_MODE" };
      }
      const stale = lwwReject(state.entityMeta[intent.block.id], entry);
      if (stale) return stale;
      return { ok: true };
    }
    case "MOVE_BLOCK": {
      if (!(intent.nodeId in state.blocks)) {
        return { ok: false, reason: "NOT_FOUND" };
      }
      if (!parentExists(state, intent.toParentId)) {
        return { ok: false, reason: "NOT_FOUND" };
      }
      if (
        intent.toParentId === intent.nodeId ||
        isDescendant(state, intent.toParentId, intent.nodeId)
      ) {
        return { ok: false, reason: "CYCLIC_MOVE" };
      }
      const block = state.blocks[intent.nodeId];
      const blockContext = block.context ?? "app";
      if (!validateParentForContext(state, intent.toParentId, blockContext)) {
        return { ok: false, reason: "WRONG_MODE" };
      }
      const stale = lwwReject(state.entityMeta[intent.nodeId], entry);
      if (stale) return stale;
      return { ok: true };
    }
    case "DELETE_BLOCK":
    case "UPDATE_BLOCK": {
      if (!(intent.nodeId in state.blocks)) {
        return { ok: false, reason: "NOT_FOUND" };
      }
      const stale = lwwReject(state.entityMeta[intent.nodeId], entry);
      if (stale) return stale;
      return { ok: true };
    }
    default:
      return null;
  }
}

function parentExists(state: AppState, id: string): boolean {
  return id in state.blocks || id in state.screens || id in state.sections;
}

export function inferContextForParent(
  state: AppState,
  parentId: string,
): BlockContext {
  if (parentId in state.blocks) {
    return state.blocks[parentId].context ?? "app";
  }
  if (parentId in state.sections) {
    return state.sections[parentId].kind.startsWith("agent-")
      ? "agent"
      : "docs";
  }
  if (parentId in state.screens) return "app";
  return "app";
}

export function validateParentForContext(
  state: AppState,
  parentId: string,
  context: BlockContext,
): boolean {
  if (parentId in state.blocks) {
    return (state.blocks[parentId].context ?? "app") === context;
  }
  if (parentId in state.sections) {
    const isAgent = state.sections[parentId].kind.startsWith("agent-");
    if (context === "agent") return isAgent;
    if (context === "docs") return !isAgent;
    return false;
  }
  if (parentId in state.screens) {
    return context === "app";
  }
  return false;
}

function isDescendant(
  state: AppState,
  candidateChildId: string,
  ancestorId: string,
): boolean {
  const queue: string[] = [...(state.children[ancestorId] ?? [])];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === undefined) break;
    if (cur === candidateChildId) return true;
    queue.push(...(state.children[cur] ?? []));
  }
  return false;
}

function lwwReject(
  existing: EntityMeta | undefined,
  entry: IntentLogEntry,
): DecideOutcome | null {
  if (!existing) return null;
  const incoming = { lamport: entry.lamport, origin: entry.origin };
  if (isStrictlyGreater(incoming, existing)) return null;
  return { ok: false, reason: "STALE_LAMPORT" };
}
