import { describe, expect, test } from "bun:test";
import { SCHEMA_VERSION } from "@/builder/types/state";
import { migrateSnapshot, MigrationError } from "./migrate";

describe("migrateSnapshot", () => {
  test("returns the snapshot as-is when schemaVersion matches", () => {
    const snap = { schemaVersion: SCHEMA_VERSION, foo: "bar" };
    expect(migrateSnapshot(snap)).toBe(snap);
  });

  test("throws MigrationError for snapshots newer than supported", () => {
    const snap = { schemaVersion: SCHEMA_VERSION + 1 };
    expect(() => migrateSnapshot(snap)).toThrow(MigrationError);
  });

  test("throws MigrationError for v0 snapshots (no auto-migration registered)", () => {
    const snap = {};
    let caught: unknown;
    try {
      migrateSnapshot(snap);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(MigrationError);
    expect((caught as MigrationError).fromVersion).toBe(0);
  });

  test("MigrationError exposes the failing step's from/to versions", () => {
    try {
      migrateSnapshot({ schemaVersion: 1 });
      throw new Error("expected throw");
    } catch (err) {
      expect(err).toBeInstanceOf(MigrationError);
      const me = err as MigrationError;
      expect(me.fromVersion).toBe(1);
      expect(me.toVersion).toBe(2);
    }
  });
});
