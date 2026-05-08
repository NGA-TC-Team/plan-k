import { defaultDataFor } from "@/builder/blocks/registry";
import type {
  AgentEdge,
  AgentNode,
  BlockContext,
  BlockEntity,
  BlockKind,
  ScreenEdge,
  ScreenEntity,
  SectionKind,
} from "@/builder/types/entity";
import type { AppState } from "@/builder/types/state";

export type SeedDeps = {
  newId: () => string;
  planId: string;
};

export type BlockSpec<K extends BlockKind = BlockKind> = {
  kind: K;
  data?: Record<string, unknown>;
};

export function b<K extends BlockKind>(
  kind: K,
  data: Record<string, unknown> = {},
): BlockSpec<K> {
  return { kind, data };
}

function ensureChildren(state: AppState, parentId: string): string[] {
  const list = state.children[parentId];
  if (list) return list;
  const created: string[] = [];
  state.children[parentId] = created;
  return created;
}

export function appendBlocks(
  state: AppState,
  deps: SeedDeps,
  parentId: string,
  context: BlockContext,
  specs: BlockSpec[],
): string[] {
  const childList = ensureChildren(state, parentId);
  const ids: string[] = [];
  for (const spec of specs) {
    const id = deps.newId();
    const data = {
      ...defaultDataFor(spec.kind),
      ...(spec.data ?? {}),
    } as Record<string, unknown>;
    const entity: BlockEntity = {
      id,
      parentId,
      kind: spec.kind,
      data,
      context,
    };
    state.blocks[id] = entity;
    childList.push(id);
    ids.push(id);
  }
  return ids;
}

// Append a nested block container (e.g. a tabs block whose children are blocks
// that compose a panel). Currently unused but kept for future tabs/modal nesting.
export function appendNestedBlocks(
  state: AppState,
  deps: SeedDeps,
  parentBlockId: string,
  context: BlockContext,
  specs: BlockSpec[],
): string[] {
  return appendBlocks(state, deps, parentBlockId, context, specs);
}

// Walk the section tree to find a section by kind. The tree is small enough
// that linear scan is fine.
export function findSectionByKind(
  state: AppState,
  kind: SectionKind,
): string | undefined {
  for (const [id, sec] of Object.entries(state.sections)) {
    if (sec.kind === kind) return id;
  }
  return undefined;
}

// For sections whose kind is shared (none currently — policy children are all
// distinct kinds — but kept for future-proofing). Returns the nth match.
export function findSectionByKindNth(
  state: AppState,
  kind: SectionKind,
  index: number,
): string | undefined {
  let i = 0;
  for (const [id, sec] of Object.entries(state.sections)) {
    if (sec.kind === kind) {
      if (i === index) return id;
      i += 1;
    }
  }
  return undefined;
}

export function addScreen(
  state: AppState,
  deps: SeedDeps,
  title: string,
  route?: string,
): ScreenEntity {
  const id = deps.newId();
  const screen: ScreenEntity = {
    id,
    planId: deps.planId,
    title,
    ...(route ? { route } : {}),
  };
  state.screens[id] = screen;
  state.children[id] = [];
  return screen;
}

export function addScreenEdge(
  state: AppState,
  deps: SeedDeps,
  from: string,
  to: string,
  label?: string,
): void {
  const id = deps.newId();
  const edge: ScreenEdge = {
    id,
    from,
    to,
    ...(label ? { label } : {}),
  };
  state.screenEdges[id] = edge;
}

export function addAgentNode(
  state: AppState,
  deps: SeedDeps,
  role: AgentNode["role"],
  label: string,
  data: Record<string, unknown> = {},
): AgentNode {
  const id = deps.newId();
  const node: AgentNode = { id, role, label, data };
  state.agentNodes[id] = node;
  return node;
}

export function addAgentEdge(
  state: AppState,
  deps: SeedDeps,
  from: string,
  to: string,
): void {
  const id = deps.newId();
  const edge: AgentEdge = { id, from, to };
  state.agentEdges[id] = edge;
}

// Convenience: populate an entire section by kind. Caller passes the section
// kind and the block specs; we resolve the section id and append.
export function fillSection(
  state: AppState,
  deps: SeedDeps,
  kind: SectionKind,
  specs: BlockSpec[],
): void {
  const sectionId = findSectionByKind(state, kind);
  if (!sectionId) return;
  appendBlocks(state, deps, sectionId, "docs", specs);
}
