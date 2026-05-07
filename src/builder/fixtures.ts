import type { BlockEntity, BlockKind } from "./types/entity";
import type {
  Intent,
  IntentLogEntry,
  LamportClock,
  OriginId,
} from "./types/intent";
import type { AppState, PendingEntry } from "./types/state";

export function makeEmptyState(overrides: Partial<AppState> = {}): AppState {
  return {
    projects: {},
    plans: {},
    blocks: {},
    screens: {},
    agentNodes: {},
    agentEdges: {},
    screenEdges: {},
    sections: {},
    docsRootIds: [],
    currentScreenId: null,
    children: {},
    entityMeta: {},
    selection: { kind: "none" },
    editing: { kind: "none" },
    agentTab: "scenario",
    viewMode: "detail",
    origin: "human:test",
    lamport: 0,
    pending: {},
    appliedEntries: [],
    historyPast: [],
    historyFuture: [],
    lastError: null,
    ...overrides,
  };
}

export function makeBlock(
  id: string,
  parentId: string,
  kind: BlockKind = "text",
  data: Record<string, unknown> = {},
): BlockEntity {
  return { id, parentId, kind, data, context: "app" };
}

export type BlockSpec = {
  id: string;
  parentId: string;
  kind?: BlockKind;
  data?: Record<string, unknown>;
};

export function withBlocks(state: AppState, specs: BlockSpec[]): AppState {
  const blocks: Record<string, BlockEntity> = { ...state.blocks };
  const children: Record<string, string[]> = { ...state.children };
  for (const spec of specs) {
    blocks[spec.id] = makeBlock(spec.id, spec.parentId, spec.kind, spec.data);
    children[spec.parentId] = [...(children[spec.parentId] ?? []), spec.id];
  }
  return { ...state, blocks, children };
}

export function makeEntry<I extends Intent>(
  intent: I,
  overrides: Partial<Omit<IntentLogEntry<I>, "intent">> = {},
): IntentLogEntry<I> {
  return {
    id: overrides.id ?? "entry-test",
    planId: overrides.planId ?? "plan-1",
    origin: overrides.origin ?? "human:test",
    lamport: overrides.lamport ?? 1,
    intent,
    createdAt: overrides.createdAt ?? 0,
    parentEntryId: overrides.parentEntryId,
    kind: overrides.kind ?? "primary",
  };
}

export function stamp(lamport: LamportClock, origin: OriginId) {
  return { lamport, origin };
}

export function withPending(
  state: AppState,
  pendings: Array<{ entry: IntentLogEntry; inverse?: Intent | null }>,
): AppState {
  const next: Record<string, PendingEntry> = { ...state.pending };
  for (const p of pendings) {
    next[p.entry.id] = { entry: p.entry, inverse: p.inverse ?? null };
  }
  return { ...state, pending: next };
}
