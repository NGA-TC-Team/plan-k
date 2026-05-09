import { create } from "zustand";
import { useErrorsStore } from "@/services/stores/errors-store";
import { decide } from "./decider";
import { wrap } from "./envelope";
import { defaultIdFactory } from "./ids";
import { invert } from "./inverse";
import { tick } from "./lamport";
import { apply } from "./reducer";
import { type RunnerDeps, runCommand, type SideEffects } from "./runner";
import type {
  Command,
  EntryId,
  Intent,
  IntentLogEntry,
  OriginId,
} from "./types/intent";
import type { AppState } from "./types/state";
import { HISTORY_DEPTH_DEFAULT, popRedo, popUndo, recordHistory } from "./undo";

export type StoreConfig = {
  planId: string;
  origin: OriginId;
  now?: () => number;
  newId?: () => EntryId;
  effects?: SideEffects;
  initialState?: AppState;
  historyDepth?: number;
};

export type StepCtx = {
  planId: string;
  origin: OriginId;
  now: () => number;
  newId: () => EntryId;
  historyDepth: number;
};

export type StepOpts = {
  skipHistory?: boolean;
  skipPending?: boolean;
};

export type StepResult = {
  state: AppState;
  commands: Command[];
  // Populated only for user-action intents — the batch path needs them so
  // it can reverse-compose its children's inverses into a single composite.
  entry?: IntentLogEntry;
  inverse?: Intent | null;
};

export function createInitialState(origin: OriginId): AppState {
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
    origin,
    lamport: 0,
    pending: {},
    appliedEntries: [],
    historyPast: [],
    historyFuture: [],
    lastError: null,
  };
}

const NON_USER_INTENTS = new Set<Intent["type"]>([
  "REMOTE_INTENT_RECEIVED",
  "PERSIST_SUCCEEDED",
  "PERSIST_FAILED",
  "UNDO",
  "REDO",
  "SWITCH_VIEW_MODE",
  "SWITCH_AGENT_TAB",
  "SWITCH_SCREEN",
  // editing lifecycle (UI-local) — only COMMIT_EDIT persists block.data
  "BEGIN_EDIT",
  "CHANGE_DRAFT",
  "CANCEL_EDIT",
  "SELECT_NODE",
  "SELECT_NODES",
]);

function isUserAction(type: Intent["type"]): boolean {
  return !NON_USER_INTENTS.has(type);
}

export function step(
  state: AppState,
  intent: Intent,
  ctx: StepCtx,
  opts: StepOpts = {},
): StepResult {
  if (intent.type === "UNDO") {
    const popped = popUndo(state);
    if (!popped || !popped.frame.inverse) return { state, commands: [] };
    return step(popped.state, popped.frame.inverse, ctx, {
      ...opts,
      skipHistory: true,
    });
  }
  if (intent.type === "REDO") {
    const popped = popRedo(state);
    if (!popped) return { state, commands: [] };
    return step(popped.state, popped.frame.entry.intent, ctx, {
      ...opts,
      skipHistory: true,
    });
  }

  if (intent.type === "BATCH") {
    return applyBatch(state, intent.intents, ctx, opts);
  }

  const ticked = tick(state.lamport);
  const tickedState = { ...state, lamport: ticked };
  const entry = wrap(intent, {
    planId: ctx.planId,
    origin: ctx.origin,
    lamport: ticked,
    now: ctx.now,
    newId: ctx.newId,
  });

  return applyEntry(tickedState, entry, ctx, opts);
}

function applyEntry(
  state: AppState,
  entry: IntentLogEntry,
  ctx: StepCtx,
  opts: StepOpts,
): StepResult {
  const prevState = state;
  const decision = decide(state, entry);
  if (!decision.ok) {
    // Push warn to errors-store. The EMIT_TOAST command below will also call
    // toast.warning via runner.ts. The dedupe gate in errors-store (same
    // message within 1000 ms) will suppress the second toast automatically —
    // no "silent" flag needed.
    useErrorsStore.getState().push({
      severity: "warn",
      source: "reducer",
      message: decision.reason,
      context: { intentType: entry.intent.type },
    });
    return {
      state: {
        ...state,
        lastError: { reason: decision.reason, at: ctx.now() },
      },
      commands: [
        {
          type: "EMIT_TOAST",
          level: "warn",
          message: decision.reason,
        },
      ],
    };
  }

  const transition = apply(state, entry);
  let nextState = transition.state;
  let commands: Command[] = [...transition.commands];

  let inverse: Intent | null = null;
  if (isUserAction(entry.intent.type)) {
    inverse = invert(entry, prevState);
    if (!opts.skipHistory) {
      nextState = recordHistory(
        nextState,
        { entry, inverse },
        ctx.historyDepth,
      );
    }
    if (!opts.skipPending) {
      nextState = {
        ...nextState,
        pending: {
          ...nextState.pending,
          [entry.id]: { entry, inverse },
        },
      };
      commands = [{ type: "PERSIST_INTENT", entry }, ...commands];
    }
  }

  if (entry.intent.type === "REMOTE_INTENT_RECEIVED") {
    const innerResult = applyEntry(nextState, entry.intent.entry, ctx, {
      skipHistory: true,
      skipPending: true,
    });
    nextState = innerResult.state;
    commands = [...commands, ...innerResult.commands];
  }

  return { state: nextState, commands, entry, inverse };
}

/**
 * Run a list of child intents as a single coalesced unit. Each child still
 * generates its own IntentLogEntry + persistence command, so the server
 * sees them individually and remote replicas reconstruct the same state.
 * What changes is history: the whole batch occupies ONE HistoryFrame whose
 * inverse is itself a BATCH of each child's inverse, reversed. ⌘Z therefore
 * undoes the whole operation; ⌘⇧Z redoes it.
 *
 * Children that fail decision (e.g. NOT_FOUND for a sibling already deleted
 * earlier in the batch) are silently dropped from the inverse — they didn't
 * actually mutate state, so no inverse is needed.
 */
function applyBatch(
  state: AppState,
  children: Intent[],
  ctx: StepCtx,
  opts: StepOpts,
): StepResult {
  if (children.length === 0) return { state, commands: [] };
  let cur: AppState = state;
  const allCommands: Command[] = [];
  const childInverses: Intent[] = [];
  for (const child of children) {
    const r = step(cur, child, ctx, { ...opts, skipHistory: true });
    cur = r.state;
    allCommands.push(...r.commands);
    if (r.inverse) childInverses.push(r.inverse);
  }
  // Outer entry uses the lamport already advanced by the children. It is
  // not persisted — only the children are — so its lamport is just for
  // the history frame's identity.
  const outerEntry: IntentLogEntry = {
    id: ctx.newId(),
    planId: ctx.planId,
    origin: ctx.origin,
    lamport: cur.lamport,
    intent: { type: "BATCH", intents: children },
    createdAt: ctx.now(),
    kind: "primary",
  };
  const compositeInverse: Intent | null =
    childInverses.length > 0
      ? { type: "BATCH", intents: childInverses.slice().reverse() }
      : null;
  if (!opts.skipHistory && compositeInverse) {
    cur = recordHistory(
      cur,
      { entry: outerEntry, inverse: compositeInverse },
      ctx.historyDepth,
    );
  }
  return {
    state: cur,
    commands: allCommands,
    entry: outerEntry,
    inverse: compositeInverse,
  };
}

export type BuilderStore = {
  state: AppState;
  dispatch: (intent: Intent) => void;
};

export function createBuilderStore(config: StoreConfig) {
  const idFactory = defaultIdFactory();
  const ctx: StepCtx = {
    planId: config.planId,
    origin: config.origin,
    now: config.now ?? Date.now,
    newId: config.newId ?? idFactory.newEntryId,
    historyDepth: config.historyDepth ?? HISTORY_DEPTH_DEFAULT,
  };
  return create<BuilderStore>((set, get) => {
    const dispatch = (intent: Intent): void => {
      let result: StepResult;
      try {
        result = step(get().state, intent, ctx);
      } catch (err: unknown) {
        // Reducer threw unexpectedly. Push to errors-store so the toast
        // pipeline fires; let lastError mechanism continue via a no-op result.
        const message = String(
          (err instanceof Error ? err.message : null) ??
            err ??
            "Unknown reducer error",
        );
        const detail = err instanceof Error ? (err.stack ?? message) : message;
        useErrorsStore.getState().push({
          severity: "error",
          source: "reducer",
          message,
          detail,
          context: { intentType: intent.type },
        });
        return;
      }
      set({ state: result.state });
      const runnerDeps: RunnerDeps = { dispatch, ...(config.effects ?? {}) };
      for (const cmd of result.commands) {
        runCommand(cmd, runnerDeps);
      }
    };
    return {
      state: config.initialState ?? createInitialState(config.origin),
      dispatch,
    };
  });
}
