import type { IntentLogEntry } from "../types/intent";
import type { AppState, EntityMeta, SliceResult } from "../types/state";

/**
 * Reducer slice for UPDATE_ENTITY_META.
 *
 * Entity existence check: at least one of sections / blocks / screens /
 * agentNodes must contain the entityId. Unknown ids → no-op (return null),
 * matching the existing sections.ts pattern.
 *
 * tags: replaced wholesale and deduplicated. Empty array is preserved as-is
 * (explicit clear). Nulled scalar fields (status / assignee / dueDate) are
 * deleted from the record.
 */
export function applyEntityMeta(
  state: AppState,
  entry: IntentLogEntry,
): SliceResult | null {
  const { intent } = entry;

  if (intent.type !== "UPDATE_ENTITY_META") return null;

  const { entityId, patch } = intent;

  // Entity existence guard — no-op on unknown id.
  const entityExists =
    entityId in state.sections ||
    entityId in state.blocks ||
    entityId in state.screens ||
    entityId in state.agentNodes;

  if (!entityExists) return null;

  const prev: EntityMeta = state.entityMeta[entityId] ?? {
    lamport: entry.lamport,
    origin: entry.origin,
  };

  // Start with previous fields, then stamp the new lamport/origin.
  const next: EntityMeta = {
    ...prev,
    lamport: entry.lamport,
    origin: entry.origin,
  };

  // status: null → delete, value → set, undefined → leave unchanged.
  if (patch.status === null) {
    delete next.status;
  } else if (patch.status !== undefined) {
    next.status = patch.status;
  }

  // assignee: same null/value/undefined pattern.
  if (patch.assignee === null) {
    delete next.assignee;
  } else if (patch.assignee !== undefined) {
    next.assignee = patch.assignee;
  }

  // dueDate: same null/value/undefined pattern.
  if (patch.dueDate === null) {
    delete next.dueDate;
  } else if (patch.dueDate !== undefined) {
    next.dueDate = patch.dueDate;
  }

  // tags: wholesale replacement with dedup. Empty array is preserved (explicit clear).
  if (patch.tags !== undefined) {
    next.tags = Array.from(new Set(patch.tags));
  }

  // viewModeOverride: null → delete (fall back to global), value → set, undefined → leave.
  if (patch.viewModeOverride === null) {
    delete next.viewModeOverride;
  } else if (patch.viewModeOverride !== undefined) {
    next.viewModeOverride = patch.viewModeOverride;
  }

  return {
    state: {
      ...state,
      entityMeta: { ...state.entityMeta, [entityId]: next },
    },
    commands: [],
  };
}
