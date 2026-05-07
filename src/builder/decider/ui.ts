import type { IntentLogEntry } from "../types/intent";
import type { AppState, DecideOutcome } from "../types/state";

export function decideUi(
  state: AppState,
  entry: IntentLogEntry,
): DecideOutcome | null {
  const { intent } = entry;
  switch (intent.type) {
    case "SWITCH_VIEW_MODE":
    case "SWITCH_AGENT_TAB":
      return { ok: true };
    case "SWITCH_SCREEN":
      if (intent.screenId === null) return { ok: true };
      if (!(intent.screenId in state.screens)) {
        return { ok: false, reason: "NOT_FOUND" };
      }
      return { ok: true };
    default:
      return null;
  }
}
