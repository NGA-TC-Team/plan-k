import type { IntentLogEntry } from "../types/intent";
import type { AppState, SliceResult } from "../types/state";

export function applyProjects(
  state: AppState,
  entry: IntentLogEntry,
): SliceResult | null {
  const { intent } = entry;
  if (intent.type === "UPDATE_PROJECT") {
    const project = state.projects[intent.projectId];
    if (!project) return null;
    const next = {
      ...project,
      ...(intent.patch.title !== undefined
        ? { title: intent.patch.title }
        : {}),
      ...(intent.patch.summary !== undefined
        ? { summary: intent.patch.summary }
        : {}),
      updatedAt: entry.createdAt,
    };
    return {
      state: {
        ...state,
        projects: {
          ...state.projects,
          [intent.projectId]: next,
        },
        entityMeta: {
          ...state.entityMeta,
          [intent.projectId]: {
            lamport: entry.lamport,
            origin: entry.origin,
          },
        },
      },
      commands: [],
    };
  }
  if (intent.type === "DELETE_PROJECT") {
    if (!(intent.projectId in state.projects)) return null;
    const { [intent.projectId]: _removed, ...remainingProjects } =
      state.projects;
    const { [intent.projectId]: _meta, ...remainingMeta } = state.entityMeta;
    return {
      state: {
        ...state,
        projects: remainingProjects,
        entityMeta: remainingMeta,
      },
      commands: [],
    };
  }
  return null;
}
