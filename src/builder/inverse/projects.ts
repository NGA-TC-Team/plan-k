import type { Intent, IntentLogEntry } from "../types/intent";
import type { AppState } from "../types/state";

export function invertProjects(
  entry: IntentLogEntry,
  prevState: AppState,
): Intent | null {
  const { intent } = entry;
  if (intent.type === "UPDATE_PROJECT") {
    const project = prevState.projects[intent.projectId];
    if (!project) return null;
    const patch: { title?: string; summary?: string } = {};
    if (intent.patch.title !== undefined) patch.title = project.title;
    if (intent.patch.summary !== undefined) patch.summary = project.summary;
    return {
      type: "UPDATE_PROJECT",
      projectId: intent.projectId,
      patch,
    };
  }
  // DELETE_PROJECT is irreversible — the plan and its intent log are
  // cascade-deleted by the side-effect, so an inverse cannot meaningfully
  // restore prior state. Return null to mark it non-undoable.
  return null;
}
