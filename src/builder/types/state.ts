import type {
  AgentEdge,
  AgentNode,
  BlockEntity,
  PlanShell,
  ProjectMeta,
  ScreenEdge,
  ScreenEntity,
  SectionEntity,
} from "./entity";
import type {
  EntryId,
  Intent,
  IntentLogEntry,
  LamportClock,
  OriginId,
  Reason,
} from "./intent";

export type EntityMeta = { lamport: LamportClock; origin: OriginId };

export type Selection = { kind: "none" } | { kind: "node"; id: string };

export type Editing =
  | { kind: "none" }
  | {
      kind: "node";
      id: string;
      origin: OriginId;
      lamport: LamportClock;
      draft: unknown;
      previousValue: unknown;
    };

export type AppState = {
  projects: Record<string, ProjectMeta>;
  plans: Record<string, PlanShell>;
  blocks: Record<string, BlockEntity>;
  screens: Record<string, ScreenEntity>;
  agentNodes: Record<string, AgentNode>;
  agentEdges: Record<string, AgentEdge>;
  screenEdges: Record<string, ScreenEdge>;
  sections: Record<string, SectionEntity>;
  docsRootIds: string[];
  currentScreenId: string | null;
  children: Record<string, string[]>;
  entityMeta: Record<string, EntityMeta>;

  selection: Selection;
  editing: Editing;
  agentTab: "scenario" | "graph";
  viewMode: "detail" | "wireframe";

  origin: OriginId;
  lamport: LamportClock;
  pending: Record<EntryId, PendingEntry>;
  appliedEntries: string[];

  historyPast: HistoryFrame[];
  historyFuture: HistoryFrame[];

  lastError: { reason: string; at: number } | null;
};

export type PendingEntry = {
  entry: IntentLogEntry;
  inverse: Intent | null;
};

export type HistoryFrame = {
  entry: IntentLogEntry;
  inverse: Intent | null;
};

export type Transition = {
  state: AppState;
  commands: import("./intent").Command[];
};

export type SliceResult = {
  state: AppState;
  commands: import("./intent").Command[];
};

export type DecideResult =
  | { ok: true; transition: Transition }
  | { ok: false; reason: Reason };

export type DecideOutcome = { ok: true } | { ok: false; reason: Reason };
