import { type AppState, SCHEMA_VERSION } from "@/builder/types/state";
import { SNAPSHOT_MIGRATIONS } from "./migrations";

export class MigrationError extends Error {
  readonly fromVersion: number;
  readonly toVersion: number;
  constructor(message: string, fromVersion: number, toVersion: number) {
    super(message);
    this.name = "MigrationError";
    this.fromVersion = fromVersion;
    this.toVersion = toVersion;
  }
}

// Runs registered snapshot migrations stepwise from the snapshot's
// schemaVersion up to SCHEMA_VERSION. Throws MigrationError if no path
// exists or if any step fails. Pure — does not touch the database.
export function migrateSnapshot(raw: unknown): AppState {
  const startVersion = readSchemaVersion(raw);
  if (startVersion === SCHEMA_VERSION) return raw as AppState;
  if (startVersion > SCHEMA_VERSION) {
    throw new MigrationError(
      `Snapshot v${startVersion} is newer than supported v${SCHEMA_VERSION}.`,
      startVersion,
      SCHEMA_VERSION,
    );
  }

  let current: unknown = raw;
  let version = startVersion;
  while (version < SCHEMA_VERSION) {
    const step = SNAPSHOT_MIGRATIONS.find((m) => m.fromVersion === version);
    if (!step) {
      throw new MigrationError(
        `No migration registered from v${version}.`,
        version,
        SCHEMA_VERSION,
      );
    }
    current = step.migrate(current);
    version = step.toVersion;
  }
  return current as AppState;
}

function readSchemaVersion(raw: unknown): number {
  if (raw && typeof raw === "object" && "schemaVersion" in raw) {
    const v = (raw as { schemaVersion?: unknown }).schemaVersion;
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return 0;
}
