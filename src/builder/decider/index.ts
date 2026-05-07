import type { IntentLogEntry } from "../types/intent";
import type { AppState, DecideOutcome } from "../types/state";
import { decideAgent } from "./agent";
import { decideEditing } from "./editing";
import { decideProjects } from "./projects";
import { decideScreens } from "./screens";
import { decideSections } from "./sections";
import { decideSelection } from "./selection";
import { decideStructure } from "./structure";
import { decideSync } from "./sync";
import { decideUi } from "./ui";

type SliceDecider = (
  state: AppState,
  entry: IntentLogEntry,
) => DecideOutcome | null;

const SLICES: SliceDecider[] = [
  decideSelection,
  decideEditing,
  decideStructure,
  decideUi,
  decideScreens,
  decideSections,
  decideAgent,
  decideProjects,
  decideSync,
];

export function decide(state: AppState, entry: IntentLogEntry): DecideOutcome {
  for (const slice of SLICES) {
    const out = slice(state, entry);
    if (out !== null) return out;
  }
  return { ok: true };
}
