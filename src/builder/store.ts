import { create } from "zustand";
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

export type StepResult = { state: AppState; commands: Command[] };

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

  if (isUserAction(entry.intent.type)) {
    const inverse = invert(entry, prevState);
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

  return { state: nextState, commands };
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
      const result = step(get().state, intent, ctx);
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
