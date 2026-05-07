import { isStrictlyGreater } from "../lamport";
import type { IntentLogEntry } from "../types/intent";
import type { AppState, DecideOutcome, EntityMeta } from "../types/state";

export function decideSections(
  state: AppState,
  entry: IntentLogEntry,
): DecideOutcome | null {
  const { intent } = entry;
  switch (intent.type) {
    case "INSERT_SECTION": {
      const { section } = intent;
      if (section.parentId !== null && !(section.parentId in state.sections)) {
        return { ok: false, reason: "NOT_FOUND" };
      }
      const stale = lwwReject(state.entityMeta[section.id], entry);
      if (stale) return stale;
      return { ok: true };
    }
    case "DELETE_SECTION":
    case "UPDATE_SECTION": {
      if (!(intent.sectionId in state.sections)) {
        return { ok: false, reason: "NOT_FOUND" };
      }
      const stale = lwwReject(state.entityMeta[intent.sectionId], entry);
      if (stale) return stale;
      return { ok: true };
    }
    case "MOVE_SECTION": {
      if (!(intent.sectionId in state.sections)) {
        return { ok: false, reason: "NOT_FOUND" };
      }
      if (
        intent.toParentId !== null &&
        !(intent.toParentId in state.sections)
      ) {
        return { ok: false, reason: "NOT_FOUND" };
      }
      if (
        intent.toParentId === intent.sectionId ||
        (intent.toParentId !== null &&
          isSectionDescendant(state, intent.toParentId, intent.sectionId))
      ) {
        return { ok: false, reason: "CYCLIC_MOVE" };
      }
      const stale = lwwReject(state.entityMeta[intent.sectionId], entry);
      if (stale) return stale;
      return { ok: true };
    }
    default:
      return null;
  }
}

function isSectionDescendant(
  state: AppState,
  candidateChildId: string,
  ancestorId: string,
): boolean {
  const queue: string[] = [...(state.children[ancestorId] ?? [])];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === undefined) break;
    if (cur === candidateChildId) return true;
    if (cur in state.sections) {
      queue.push(...(state.children[cur] ?? []));
    }
  }
  return false;
}

function lwwReject(
  existing: EntityMeta | undefined,
  entry: IntentLogEntry,
): DecideOutcome | null {
  if (!existing) return null;
  const incoming = { lamport: entry.lamport, origin: entry.origin };
  if (isStrictlyGreater(incoming, existing)) return null;
  return { ok: false, reason: "STALE_LAMPORT" };
}
