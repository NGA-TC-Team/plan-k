import {
  selectCanRedo,
  selectCanUndo,
  selectIsEditingNode,
  selectIsPending,
  selectIsSelected,
} from "./selectors";
import type {
  AgentNode,
  BlockContext,
  BlockKind,
  PageSettings,
  SectionKind,
} from "./types/entity";
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

// InspectPane용 ScreenViewModel — route를 포함하는 inspect 전용 뷰.
// (기존 ScreenViewModel은 blocks 트리 포함 빌더용이므로 별도 타입 사용)
export type ScreenInspectViewModel = {
  id: string;
  kind: "screen";
  title: string;
  route?: string;
};

export type SectionInspectViewModel = {
  id: string;
  kind: "section";
  title: string;
  sectionKind: SectionKind;
  planId: string;
  pageSettings?: Partial<PageSettings>;
};

export type AgentNodeInspectViewModel = {
  id: string;
  kind: "agent-node";
  label: string;
  role: AgentNode["role"];
};

export type AnyEntityKind = "block" | "screen" | "section" | "agent-node";

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

export function projectScreenInspect(
  state: AppState,
  id: string,
): ScreenInspectViewModel | null {
  const screen = state.screens[id];
  if (!screen) return null;
  return {
    id: screen.id,
    kind: "screen",
    title: screen.title,
    route: screen.route,
  };
}

export function projectSectionInspect(
  state: AppState,
  id: string,
): SectionInspectViewModel | null {
  const section = state.sections[id];
  if (!section) return null;
  return {
    id: section.id,
    kind: "section",
    title: section.title,
    sectionKind: section.kind,
    planId: section.planId,
    pageSettings: section.pageSettings,
  };
}

export function projectAgentNodeInspect(
  state: AppState,
  id: string,
): AgentNodeInspectViewModel | null {
  const node = state.agentNodes[id];
  if (!node) return null;
  return {
    id: node.id,
    kind: "agent-node",
    label: node.label,
    role: node.role,
  };
}

/**
 * entity id로 어느 entity 맵에 속하는지 판별.
 * selection이 valid하더라도 삭제 직후 null이 될 수 있으므로
 * 호출 지점에서 null 처리 필수.
 */
export function resolveEntityKind(
  state: AppState,
  id: string,
): AnyEntityKind | null {
  if (state.blocks[id]) return "block";
  if (state.screens[id]) return "screen";
  if (state.sections[id]) return "section";
  if (state.agentNodes[id]) return "agent-node";
  return null;
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
