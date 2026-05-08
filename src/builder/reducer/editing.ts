import type { Command, IntentLogEntry } from "../types/intent";
import type { AppState, SliceResult } from "../types/state";

export function applyEditing(
  state: AppState,
  entry: IntentLogEntry,
): SliceResult | null {
  const { intent } = entry;
  switch (intent.type) {
    case "BEGIN_EDIT": {
      const block = state.blocks[intent.nodeId];
      if (!block) return null;
      const lostOrigin =
        state.editing.kind === "node" && state.editing.origin !== entry.origin
          ? state.editing.origin
          : null;
      const commands: Command[] = lostOrigin
        ? [
            {
              type: "EMIT_TOAST",
              level: "warn",
              message: `Editing taken over from ${lostOrigin}`,
            },
          ]
        : [];
      return {
        state: {
          ...state,
          editing: {
            kind: "node",
            id: intent.nodeId,
            origin: entry.origin,
            lamport: entry.lamport,
            draft: block.data,
            previousValue: block.data,
          },
          selection: { kind: "node", id: intent.nodeId },
        },
        commands,
      };
    }
    case "CHANGE_DRAFT": {
      if (state.editing.kind !== "node") return null;
      return {
        state: {
          ...state,
          editing: { ...state.editing, draft: intent.value },
        },
        commands: [],
      };
    }
    case "CANCEL_EDIT": {
      if (state.editing.kind !== "node") return null;
      return {
        state: { ...state, editing: { kind: "none" } },
        commands: [],
      };
    }
    case "COMMIT_EDIT": {
      if (state.editing.kind !== "node") return null;
      const editing = state.editing;
      const block = state.blocks[editing.id];
      if (!block) return null;
      const draftData = editing.draft as Record<string, unknown>;
      // Shallow-merge so per-block metadata not tracked by the editor form
      // (spacing, interactions, etc.) survives commit. Editors that explicitly
      // remove array entries are unaffected — those keys are present in the
      // draft and overwrite cleanly.
      const mergedData = { ...block.data, ...draftData };
      return {
        state: {
          ...state,
          blocks: {
            ...state.blocks,
            [editing.id]: { ...block, data: mergedData },
          },
          entityMeta: {
            ...state.entityMeta,
            [editing.id]: { lamport: entry.lamport, origin: entry.origin },
          },
          editing: { kind: "none" },
        },
        commands: [],
      };
    }
    default:
      return null;
  }
}
