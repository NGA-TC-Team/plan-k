import type { IntentLogEntry } from "../types/intent";
import type { AppState, SliceResult } from "../types/state";
import { applyAgent } from "./agent";
import { applyEditing } from "./editing";
import { applyProjects } from "./projects";
import { applyScreens } from "./screens";
import { applySections } from "./sections";
import { applySelection } from "./selection";
import { applyStructure } from "./structure";
import { applySync } from "./sync";
import { applyUi } from "./ui";

type SliceReducer = (
  state: AppState,
  entry: IntentLogEntry,
) => SliceResult | null;

const SLICES: SliceReducer[] = [
  applySelection,
  applyEditing,
  applyStructure,
  applyUi,
  applyScreens,
  applySections,
  applyAgent,
  applyProjects,
  applySync,
];

export function apply(state: AppState, entry: IntentLogEntry): SliceResult {
  for (const slice of SLICES) {
    const out = slice(state, entry);
    if (out !== null) return out;
  }
  return { state, commands: [] };
}
