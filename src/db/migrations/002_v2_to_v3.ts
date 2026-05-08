import type { AppState } from "@/builder/types/state";
import { MigrationError } from "../migrate";

export function migrateV2ToV3(_raw: unknown): AppState {
  throw new MigrationError(
    "Snapshot v2 cannot be migrated automatically. Export the plan, then reset.",
    2,
    3,
  );
}
