import type { BlockEntity, ScreenEntity } from "./types/entity";
import type { Intent } from "./types/intent";
import type { AppState } from "./types/state";

export function selectBlock(
  state: AppState,
  id: string,
): BlockEntity | undefined {
  return state.blocks[id];
}

export function selectScreen(
  state: AppState,
  id: string,
): ScreenEntity | undefined {
  return state.screens[id];
}

export function selectChildren(
  state: AppState,
  parentId: string,
): BlockEntity[] {
  const ids = state.children[parentId] ?? [];
  const result: BlockEntity[] = [];
  for (const id of ids) {
    const block = state.blocks[id];
    if (block) result.push(block);
  }
  return result;
}

export function selectIsSelected(state: AppState, id: string): boolean {
  if (state.selection.kind === "node") return state.selection.id === id;
  if (state.selection.kind === "multi") return state.selection.ids.includes(id);
  return false;
}

export function selectSelectedIds(state: AppState): string[] {
  if (state.selection.kind === "node") return [state.selection.id];
  if (state.selection.kind === "multi") return state.selection.ids;
  return [];
}

export function selectIsEditingNode(state: AppState, id: string): boolean {
  return state.editing.kind === "node" && state.editing.id === id;
}

export function selectEditingDraft(state: AppState): unknown | null {
  return state.editing.kind === "node" ? state.editing.draft : null;
}

export function selectIsPending(state: AppState, entityId: string): boolean {
  for (const p of Object.values(state.pending)) {
    if (entityIdOfIntent(p.entry.intent) === entityId) return true;
  }
  return false;
}

export function selectCanUndo(state: AppState): boolean {
  return state.historyPast.length > 0;
}

export function selectCanRedo(state: AppState): boolean {
  return state.historyFuture.length > 0;
}

export function selectError(state: AppState): AppState["lastError"] {
  return state.lastError;
}

function entityIdOfIntent(intent: Intent): string | null {
  switch (intent.type) {
    case "INSERT_BLOCK":
      return intent.block.id;
    case "MOVE_BLOCK":
    case "DELETE_BLOCK":
    case "UPDATE_BLOCK":
    case "BEGIN_EDIT":
      return intent.nodeId;
    default:
      return null;
  }
}
