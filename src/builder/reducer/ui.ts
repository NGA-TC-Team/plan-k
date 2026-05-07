import type { IntentLogEntry } from "../types/intent";
import type { AppState, SliceResult } from "../types/state";

export function applyUi(
  state: AppState,
  entry: IntentLogEntry,
): SliceResult | null {
  const { intent } = entry;
  switch (intent.type) {
    case "SWITCH_VIEW_MODE":
      return {
        state: { ...state, viewMode: intent.mode },
        commands: [],
      };
    case "SWITCH_AGENT_TAB":
      return {
        state: { ...state, agentTab: intent.tab },
        commands: [],
      };
    case "SWITCH_SCREEN":
      return {
        state: { ...state, currentScreenId: intent.screenId },
        commands: [],
      };
    default:
      return null;
  }
}
