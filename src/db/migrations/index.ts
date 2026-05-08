import type { AppState } from "@/builder/types/state";
import { migrateV0ToV1 } from "./000_v0_to_v1";
import { migrateV1ToV2 } from "./001_v1_to_v2";
import { migrateV2ToV3 } from "./002_v2_to_v3";

export type SnapshotMigration = {
  fromVersion: number;
  toVersion: number;
  migrate: (snapshot: unknown) => AppState;
};

// Registry of stepwise snapshot migrations. Each entry transforms a snapshot
// from `fromVersion` to `toVersion` (must be `fromVersion + 1`). When
// SCHEMA_VERSION moves forward, append a new migration here.
export const SNAPSHOT_MIGRATIONS: readonly SnapshotMigration[] = [
  { fromVersion: 0, toVersion: 1, migrate: migrateV0ToV1 },
  { fromVersion: 1, toVersion: 2, migrate: migrateV1ToV2 },
  { fromVersion: 2, toVersion: 3, migrate: migrateV2ToV3 },
];
