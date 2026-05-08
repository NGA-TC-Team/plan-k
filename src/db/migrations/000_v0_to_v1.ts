import type { AppState } from "@/builder/types/state";
import { MigrationError } from "../migrate";

// Pre-v1 snapshots predate the entity-based AppState refactor. We never
// wrote an automatic transform for them, so surface a clear error and let
// the caller offer export-then-reset.
export function migrateV0ToV1(_raw: unknown): AppState {
  throw new MigrationError(
    "Snapshot v0 cannot be migrated automatically. Export the plan, then reset.",
    0,
    1,
  );
}
