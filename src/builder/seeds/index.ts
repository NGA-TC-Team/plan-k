import type { ProjectKind } from "@/builder/types/entity";
import type { AppState } from "@/builder/types/state";
import { populateAgentSeed } from "./agent";
import type { SeedDeps } from "./helpers";
import { populateMobileSeed } from "./mobile";
import { populateWebSeed } from "./web";

export function populateSeed(
  state: AppState,
  kind: ProjectKind,
  deps: SeedDeps,
): void {
  switch (kind) {
    case "web":
      populateWebSeed(state, deps);
      return;
    case "mobile":
      populateMobileSeed(state, deps);
      return;
    case "agent":
      populateAgentSeed(state, deps);
      return;
  }
}
