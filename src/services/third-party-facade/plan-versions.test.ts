/**
 * Integration tests for plan-versions.ts facade.
 *
 * Strategy (B-variant): mock.module("@/db/client") + mock.module("@/db")
 * registered BEFORE any transitive import that resolves @/db, so that
 * better-sqlite3 (client.ts) is never evaluated in the bun:test process.
 * bun:sqlite + drizzle-orm/bun-sqlite in-memory DB is injected instead.
 *
 * Mirrors refs-sync.test.ts pattern.
 */

import { Database } from "bun:sqlite";
import { mock } from "bun:test";
import path from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "@/db/schema";

// ─── In-memory DB ─────────────────────────────────────────────────────────────

function makeTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.run("PRAGMA foreign_keys = ON");
  const db = drizzle({ client: sqlite, schema });
  migrate(db, {
    migrationsFolder: path.join(process.cwd(), "drizzle"),
  });
  return db;
}

const testDb = makeTestDb();

// ─── Module-level mocks (must precede all imports that touch @/db) ────────────

mock.module("@/db/client", () => ({
  db: testDb,
  schema,
}));

mock.module("@/db", () => ({
  db: testDb,
  schema,
  refs: schema.refs,
  plans: schema.plans,
  projects: schema.projects,
  intents: schema.intents,
  intentsArchive: schema.intentsArchive,
  media: schema.media,
  chatSessions: schema.chatSessions,
  chatMessages: schema.chatMessages,
  chatAttachments: schema.chatAttachments,
  chatStagedIntents: schema.chatStagedIntents,
  planVersions: schema.planVersions,
}));

// ─── Imports that depend on @/db (after mock registration) ───────────────────

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { eq, sql } from "drizzle-orm";
import {
  createPlanVersion,
  deletePlanVersion,
  getPlanVersion,
  listPlanVersions,
  PlanVersionError,
} from "./plan-versions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function seedPlan(planId: string) {
  const now = new Date();
  testDb
    .insert(schema.plans)
    .values({
      id: planId,
      kind: "web",
      snapshot: JSON.stringify({ schemaVersion: 0 }),
      snapshotSeq: 0,
      createdAt: now,
      updatedAt: now,
    })
    .run();
}

function makeVersionInput(
  planId: string,
  overrides?: Partial<{
    label: string;
    note: string;
    snapshot: string;
    serverSeqAtTag: number;
  }>,
) {
  return {
    planId,
    label: overrides?.label ?? "v1",
    note: overrides?.note ?? "",
    snapshot: overrides?.snapshot ?? JSON.stringify({ schemaVersion: 0 }),
    serverSeqAtTag: overrides?.serverSeqAtTag ?? 0,
  };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe("plan-versions facade", () => {
  let planId: string;

  beforeEach(() => {
    planId = `plan-pv-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    seedPlan(planId);
  });

  afterEach(() => {
    // Cascade deletes plan_versions rows via FK
    testDb.delete(schema.plans).where(eq(schema.plans.id, planId)).run();
  });

  // ── 1. createPlanVersion ────────────────────────────────────────────────────
  it("createPlanVersion stores row and id starts with pv_", () => {
    const row = createPlanVersion(
      makeVersionInput(planId, { label: "initial" }),
    );

    expect(row.id).toMatch(/^pv_[a-f0-9]{32}$/);
    expect(row.planId).toBe(planId);
    expect(row.label).toBe("initial");
    expect(row.note).toBe("");
    // drizzle bun-sqlite returns timestamp_ms as number from SELECT
    expect(row.createdAt).toBeTruthy();
  });

  // ── 2. listPlanVersions desc order ─────────────────────────────────────────
  it("listPlanVersions returns rows in createdAt desc order", () => {
    // Insert two versions directly with distinct timestamps to avoid ties
    const t1 = new Date(Date.now() - 2000);
    const t2 = new Date(Date.now());
    const id1 = `pv_${crypto.randomUUID().replace(/-/g, "")}`;
    const id2 = `pv_${crypto.randomUUID().replace(/-/g, "")}`;
    testDb
      .insert(schema.planVersions)
      .values({
        id: id1,
        planId,
        label: "first",
        note: "",
        snapshot: "{}",
        serverSeqAtTag: 0,
        createdAt: t1,
      })
      .run();
    testDb
      .insert(schema.planVersions)
      .values({
        id: id2,
        planId,
        label: "second",
        note: "",
        snapshot: "{}",
        serverSeqAtTag: 0,
        createdAt: t2,
      })
      .run();

    const rows = listPlanVersions(planId);
    expect(rows.length).toBe(2);
    // Newest (second) should be first
    expect(rows[0].label).toBe("second");
    expect(rows[1].label).toBe("first");
  });

  // ── 3. listPlanVersions snapshot field excluded ─────────────────────────────
  it("listPlanVersions result items do not contain snapshot field", () => {
    createPlanVersion(makeVersionInput(planId));
    const rows = listPlanVersions(planId);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(Object.keys(row)).not.toContain("snapshot");
    }
  });

  // ── 4. getPlanVersion returns correct row ───────────────────────────────────
  it("getPlanVersion returns the exact row including snapshot", () => {
    const snapshot = JSON.stringify({ schemaVersion: 1, x: 42 });
    const created = createPlanVersion(makeVersionInput(planId, { snapshot }));

    const fetched = getPlanVersion(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(created.id);
    expect(fetched?.snapshot).toBe(snapshot);
    expect(fetched?.label).toBe("v1");
  });

  // ── 5. getPlanVersion not found returns null ────────────────────────────────
  it("getPlanVersion with non-existent id returns null", () => {
    const result = getPlanVersion("pv_doesnotexist000000000000000000");
    expect(result).toBeNull();
  });

  // ── 6. deletePlanVersion success and subsequent getPlanVersion null ──────────
  it("deletePlanVersion returns true and row is gone afterwards", () => {
    const row = createPlanVersion(makeVersionInput(planId));

    const deleted = deletePlanVersion(row.id);
    expect(deleted).toBe(true);

    const fetched = getPlanVersion(row.id);
    expect(fetched).toBeNull();
  });

  // ── 7. deletePlanVersion not found returns false ────────────────────────────
  it("deletePlanVersion with non-existent id returns false", () => {
    const result = deletePlanVersion("pv_doesnotexist000000000000000000");
    expect(result).toBe(false);
  });

  // ── 8. createPlanVersion label validation ───────────────────────────────────
  it("createPlanVersion throws INVALID_LABEL for empty label", () => {
    let caught: unknown;
    try {
      createPlanVersion(makeVersionInput(planId, { label: "" }));
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(PlanVersionError);
    expect((caught as PlanVersionError).code).toBe("INVALID_LABEL");
  });

  it("createPlanVersion throws INVALID_LABEL for label > 80 chars", () => {
    const longLabel = "a".repeat(81);
    let caught: unknown;
    try {
      createPlanVersion(makeVersionInput(planId, { label: longLabel }));
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(PlanVersionError);
    expect((caught as PlanVersionError).code).toBe("INVALID_LABEL");
  });

  it("createPlanVersion accepts label of exactly 80 chars", () => {
    const label80 = "b".repeat(80);
    const row = createPlanVersion(makeVersionInput(planId, { label: label80 }));
    expect(row.label).toBe(label80);
  });

  it("createPlanVersion trims whitespace before validation", () => {
    // Only spaces → empty after trim → INVALID_LABEL
    let caught: unknown;
    try {
      createPlanVersion(makeVersionInput(planId, { label: "   " }));
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(PlanVersionError);
    expect((caught as PlanVersionError).code).toBe("INVALID_LABEL");
  });

  // ── 9. FK violation — non-existent planId ──────────────────────────────────
  it("createPlanVersion with non-existent planId throws (FK constraint)", () => {
    let caught: unknown;
    try {
      createPlanVersion(makeVersionInput("plan-does-not-exist"));
    } catch (err) {
      caught = err;
    }
    // SQLite / drizzle throws an error — we verify it is an Error instance
    expect(caught).toBeInstanceOf(Error);
  });

  // ── 10. plans CASCADE — deleting plan removes plan_versions ─────────────────
  it("deleting parent plan cascades to plan_versions rows", () => {
    createPlanVersion(makeVersionInput(planId, { label: "snap1" }));
    createPlanVersion(makeVersionInput(planId, { label: "snap2" }));

    // Verify rows exist before deletion
    expect(listPlanVersions(planId).length).toBe(2);

    // Delete the parent plan — should cascade
    testDb.delete(schema.plans).where(eq(schema.plans.id, planId)).run();

    // Count plan_versions directly
    const count = testDb
      .select({ n: sql<number>`COUNT(*)` })
      .from(schema.planVersions)
      .where(eq(schema.planVersions.planId, planId))
      .get();
    expect(count?.n).toBe(0);
  });
});
