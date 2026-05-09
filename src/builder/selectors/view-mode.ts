import type { AppState } from "../types/state";

/**
 * Effective viewMode for a given entity (section or screen).
 *
 * Priority: entityMeta.viewModeOverride → state.viewMode (global fallback).
 *
 * Pass `entityId = null` when there is no relevant entity context — falls
 * back to global immediately.
 */
export function getEffectiveViewMode(
  state: AppState,
  entityId: string | null,
): "detail" | "wireframe" {
  if (!entityId) return state.viewMode;
  const override = state.entityMeta[entityId]?.viewModeOverride;
  return override ?? state.viewMode;
}
