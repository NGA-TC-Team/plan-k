import type { AppState } from "@/builder/types/state";
import { MigrationError } from "../migrate";

export function migrateV1ToV2(_raw: unknown): AppState {
  throw new MigrationError(
    "Snapshot v1 cannot be migrated automatically. Export the plan, then reset.",
    1,
    2,
  );
}
