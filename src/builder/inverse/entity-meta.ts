import type {
  Intent,
  IntentLogEntry,
  UpdateEntityMetaPatch,
} from "../types/intent";
import type { AppState } from "../types/state";

/**
 * Inverse for UPDATE_ENTITY_META.
 *
 * Reads the prior entityMeta snapshot and produces a patch that restores
 * each changed field to its previous value:
 *  - Field was set in patch   → inverse sets it back to prev value (or null
 *    if prev was absent, so the reducer deletes it).
 *  - tags replaced wholesale  → inverse restores prev.tags (or [] if absent).
 *  - Fields not in the patch  → not included in the inverse patch (unchanged).
 */
export function invertEntityMeta(
  entry: IntentLogEntry,
  prevState: AppState,
): Intent | null {
  const { intent } = entry;

  if (intent.type !== "UPDATE_ENTITY_META") return null;

  const { entityId, patch } = intent;
  const prev = prevState.entityMeta[entityId];

  // If the entity had no prior meta we still need to produce an inverse that
  // "removes" whatever the forward intent set. Use null for scalar fields so
  // the reducer deletes them.
  const invertedPatch: UpdateEntityMetaPatch = {};

  if ("status" in patch) {
    // prev.status undefined → null (delete in reverse), otherwise restore.
    invertedPatch.status = prev?.status ?? null;
  }

  if ("assignee" in patch) {
    invertedPatch.assignee = prev?.assignee ?? null;
  }

  if ("dueDate" in patch) {
    invertedPatch.dueDate = prev?.dueDate ?? null;
  }

  if ("tags" in patch) {
    // Restore previous tags array; empty if there were none.
    invertedPatch.tags = prev?.tags !== undefined ? [...prev.tags] : [];
  }

  if ("viewModeOverride" in patch) {
    // prev.viewModeOverride undefined → null (delete in reverse), otherwise restore.
    invertedPatch.viewModeOverride = prev?.viewModeOverride ?? null;
  }

  return {
    type: "UPDATE_ENTITY_META",
    entityId,
    patch: invertedPatch,
  };
}
