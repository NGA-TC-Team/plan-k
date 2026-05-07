import {
  selectCanRedo,
  selectCanUndo,
  selectIsEditingNode,
  selectIsPending,
  selectIsSelected,
} from "./selectors";
import type { BlockContext, BlockKind } from "./types/entity";
import type { AppState } from "./types/state";

export type BlockViewModel = {
  id: string;
  kind: BlockKind;
  context: BlockContext;
  parentId: string;
  data: Record<string, unknown>;
  isSelected: boolean;
  isEditing: boolean;
  isPending: boolean;
  displayValue: Record<string, unknown>;
};

export type BlockTreeNode = BlockViewModel & {
  children: BlockTreeNode[];
};

export type ScreenViewModel = {
  id: string;
  title: string;
  blocks: BlockTreeNode[];
};

export type BuilderViewModel = {
  screen: ScreenViewModel | null;
  selectionId: string | null;
  editingId: string | null;
  viewMode: "detail" | "wireframe";
  agentTab: "scenario" | "graph";
  canUndo: boolean;
  canRedo: boolean;
  lastError: AppState["lastError"];
};

export function projectBlock(
  state: AppState,
  blockId: string,
): BlockViewModel | null {
  const block = state.blocks[blockId];
  if (!block) return null;
  const isEditing = selectIsEditingNode(state, blockId);
  const draft =
    state.editing.kind === "node" && state.editing.id === blockId
      ? state.editing.draft
      : null;
  const displayValue =
    isEditing && draft !== null && typeof draft === "object"
      ? (draft as Record<string, unknown>)
      : block.data;
  return {
    id: block.id,
    kind: block.kind,
    context: block.context ?? "app",
    parentId: block.parentId,
    data: block.data,
    isSelected: selectIsSelected(state, blockId),
    isEditing,
    isPending: selectIsPending(state, blockId),
    displayValue,
  };
}

export function projectBlockTree(
  state: AppState,
  blockId: string,
): BlockTreeNode | null {
  const vm = projectBlock(state, blockId);
  if (!vm) return null;
  const childIds = state.children[blockId] ?? [];
  const children: BlockTreeNode[] = [];
  for (const id of childIds) {
    const child = projectBlockTree(state, id);
    if (child) children.push(child);
  }
  return { ...vm, children };
}

export function projectScreen(
  state: AppState,
  screenId: string,
): ScreenViewModel | null {
  const screen = state.screens[screenId];
  if (!screen) return null;
  const childIds = state.children[screenId] ?? [];
  const blocks: BlockTreeNode[] = [];
  for (const id of childIds) {
    const tree = projectBlockTree(state, id);
    if (tree) blocks.push(tree);
  }
  return { id: screen.id, title: screen.title, blocks };
}

export function projectBuilder(
  state: AppState,
  screenId: string | null,
): BuilderViewModel {
  return {
    screen: screenId !== null ? projectScreen(state, screenId) : null,
    selectionId: state.selection.kind === "node" ? state.selection.id : null,
    editingId: state.editing.kind === "node" ? state.editing.id : null,
    viewMode: state.viewMode,
    agentTab: state.agentTab,
    canUndo: selectCanUndo(state),
    canRedo: selectCanRedo(state),
    lastError: state.lastError,
  };
}
