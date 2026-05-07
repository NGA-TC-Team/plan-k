import type {
  AgentEdge,
  AgentNode,
  BlockEntity,
  ScreenEdge,
  ScreenEntity,
  SectionEntity,
} from "./entity";

export type OriginId = string;
export type EntryId = string;
export type LamportClock = number;

export type Reason =
  | "NOT_FOUND"
  | "WRONG_MODE"
  | "READ_ONLY"
  | "DUPLICATE_ENTRY"
  | "STALE_LAMPORT"
  | "CYCLIC_MOVE"
  | "EMPTY_HISTORY";

export type Intent =
  | { type: "SELECT_NODE"; nodeId: string | null }
  | { type: "BEGIN_EDIT"; nodeId: string }
  | { type: "CHANGE_DRAFT"; value: unknown }
  | { type: "COMMIT_EDIT" }
  | { type: "CANCEL_EDIT" }
  | {
      type: "INSERT_BLOCK";
      parentId: string;
      block: BlockEntity;
      index?: number;
    }
  | { type: "MOVE_BLOCK"; nodeId: string; toParentId: string; index: number }
  | { type: "DELETE_BLOCK"; nodeId: string }
  | { type: "UPDATE_BLOCK"; nodeId: string; patch: Partial<BlockEntity> }
  | { type: "SWITCH_VIEW_MODE"; mode: "detail" | "wireframe" }
  | { type: "SWITCH_AGENT_TAB"; tab: "scenario" | "graph" }
  | { type: "SWITCH_SCREEN"; screenId: string | null }
  | { type: "INSERT_SCREEN"; screen: ScreenEntity; index?: number }
  | { type: "DELETE_SCREEN"; screenId: string }
  | {
      type: "UPDATE_SCREEN";
      screenId: string;
      patch: Partial<ScreenEntity>;
    }
  | { type: "INSERT_SCREEN_EDGE"; edge: ScreenEdge }
  | { type: "DELETE_SCREEN_EDGE"; edgeId: string }
  | { type: "INSERT_SECTION"; section: SectionEntity; index?: number }
  | { type: "DELETE_SECTION"; sectionId: string }
  | {
      type: "UPDATE_SECTION";
      sectionId: string;
      patch: Partial<SectionEntity>;
    }
  | {
      type: "MOVE_SECTION";
      sectionId: string;
      toParentId: string | null;
      index: number;
    }
  | {
      type: "UPDATE_PROJECT";
      projectId: string;
      patch: { title?: string; summary?: string };
    }
  | { type: "DELETE_PROJECT"; projectId: string }
  | { type: "INSERT_AGENT_NODE"; node: AgentNode }
  | { type: "DELETE_AGENT_NODE"; nodeId: string }
  | { type: "CONNECT_AGENT_NODES"; edge: AgentEdge }
  | { type: "DISCONNECT_AGENT_NODES"; edgeId: string }
  | { type: "PERSIST_SUCCEEDED"; entryId: EntryId }
  | { type: "PERSIST_FAILED"; entryId: EntryId; reason: string }
  | { type: "REMOTE_INTENT_RECEIVED"; entry: IntentLogEntry }
  | { type: "UNDO" }
  | { type: "REDO" };

export type Command =
  | { type: "PERSIST_INTENT"; entry: IntentLogEntry }
  | { type: "FOCUS_NODE"; nodeId: string }
  | { type: "EMIT_TOAST"; level: "info" | "warn" | "error"; message: string }
  | { type: "DISPATCH_INTENT"; intent: Intent };

export type IntentLogEntry<I extends Intent = Intent> = {
  id: EntryId;
  planId: string;
  origin: OriginId;
  lamport: LamportClock;
  intent: I;
  createdAt: number;
  parentEntryId?: EntryId;
  kind: "primary" | "inverse";
};
