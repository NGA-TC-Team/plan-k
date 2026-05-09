import type { BlockKind, EntityStatus } from "@/builder/types/entity";

export type DiffEntityKind =
  | "project"
  | "plan"
  | "section"
  | "screen"
  | "block"
  | "agentNode"
  | "agentEdge"
  | "screenEdge";

export type EntityDiffEntry = {
  kind: DiffEntityKind;
  id: string;
  /** For "modified": list of changed top-level field paths (e.g. ["data", "context"]) */
  changedFields?: string[];
  /** For blocks: kind label for display */
  blockKind?: BlockKind;
  /** Display label (e.g. block kind, screen title, section title) */
  label?: string;
  /** Meta-only field changes (status / assignee / dueDate / viewModeOverride) */
  metaChanges?: Array<{
    field: keyof EntityStatusFields;
    before: unknown;
    after: unknown;
  }>;
};

export type ChildrenMoveEntry = {
  parentId: string;
  before: string[];
  after: string[];
};

export type DiffReport = {
  added: EntityDiffEntry[];
  removed: EntityDiffEntry[];
  modified: EntityDiffEntry[];
  moved: ChildrenMoveEntry[];
};

/** Subset of EntityMeta fields that are tracked for semantic changes */
export type EntityStatusFields = {
  status?: EntityStatus;
  assignee?: string;
  dueDate?: number;
  viewModeOverride?: "detail" | "wireframe";
};

export type BlockTextDiff = {
  blockId: string;
  /** e.g. "data.text" / "data.markdown" */
  field: string;
  parts: Array<{ added?: boolean; removed?: boolean; value: string }>;
};
