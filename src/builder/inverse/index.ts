import type { Intent, IntentLogEntry } from "../types/intent";
import type { AppState } from "../types/state";
import { invertAgent } from "./agent";
import { invertEditing } from "./editing";
import { invertProjects } from "./projects";
import { invertScreens } from "./screens";
import { invertSections } from "./sections";
import { invertSelection } from "./selection";
import { invertStructure } from "./structure";

type SliceInvert = (
  entry: IntentLogEntry,
  prevState: AppState,
) => Intent | null;

const SLICES: SliceInvert[] = [
  invertSelection,
  invertEditing,
  invertStructure,
  invertScreens,
  invertSections,
  invertAgent,
  invertProjects,
];

export function invert(
  entry: IntentLogEntry,
  prevState: AppState,
): Intent | null {
  for (const slice of SLICES) {
    const result = slice(entry, prevState);
    if (result !== null) return result;
  }
  return null;
}
