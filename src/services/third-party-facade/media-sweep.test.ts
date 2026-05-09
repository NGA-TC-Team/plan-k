/**
 * Integration tests for media-sweep.ts (runMediaSweep).
 *
 * DB isolation: uses bun:sqlite (native to Bun) + drizzle-orm/bun-sqlite
 * with an in-memory database — same pattern as media-store.test.ts.
 *
 * FS isolation: each test creates a temporary directory under os.tmpdir()
 * as the sweep root, cleaned up in afterAll.
 */

import { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "@/db/schema";
import { runMediaSweep } from "./media-sweep";

// ─── Test DB setup ─────────────────────────────────────────────────────────
// Mirrors makeTestDb() in media-store.test.ts exactly.

function makeTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.run("PRAGMA foreign_keys = ON");
  const db = drizzle({ client: sqlite, schema });
  migrate(db, {
    migrationsFolder: path.join(process.cwd(), "drizzle"),
  });
  return db;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Create a uniquely-named temp directory to use as the sweep root. */
async function makeTempRoot(label: string): Promise<string> {
  const dir = path.join(os.tmpdir(), `media-sweep-test-${label}-${Date.now()}`);
  await mkdir(dir, { recursive: true });
  return dir;
}

/** Seed a minimal plans row so FK constraints pass. */
function seedPlan(db: ReturnType<typeof makeTestDb>, planId: string) {
  const now = new Date();
  db.insert(schema.plans)
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

/** Create a planId directory (and optionally a file inside) inside root. */
async function makePlanDir(
  root: string,
  planId: string,
  withFile = false,
): Promise<void> {
  const dir = path.join(root, planId);
  await mkdir(dir, { recursive: true });
  if (withFile) {
    await writeFile(path.join(dir, "asset.png"), "fake-image");
  }
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("runMediaSweep — orphan + valid coexistence", () => {
  const db = makeTestDb();
  let root: string;
  const validPlanId = `plan-valid-${Date.now()}`;
  const orphanPlanId = `plan-orphan-${Date.now()}`;

  beforeAll(async () => {
    root = await makeTempRoot("coexist");
    // Seed valid plan in DB — orphan is intentionally NOT seeded.
    seedPlan(db, validPlanId);
    // Create both directories on disk.
    await makePlanDir(root, validPlanId, true);
    await makePlanDir(root, orphanPlanId, true);
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("removes only the orphan directory, preserves valid one", async () => {
    const result = await runMediaSweep({ root, db });

    // Orphan directory must be gone.
    await expect(stat(path.join(root, orphanPlanId))).rejects.toThrow();

    // Valid directory must still exist.
    const validStat = await stat(path.join(root, validPlanId));
    expect(validStat.isDirectory()).toBe(true);

    expect(result.scanned).toBe(2);
    expect(result.removed).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("runMediaSweep — empty local-media/", () => {
  const db = makeTestDb();
  let root: string;

  beforeAll(async () => {
    root = await makeTempRoot("empty");
    // Directory exists but is empty.
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("returns scanned=0 removed=0 without throwing", async () => {
    const result = await runMediaSweep({ root, db });
    expect(result.scanned).toBe(0);
    expect(result.removed).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("runMediaSweep — local-media/ directory absent", () => {
  const db = makeTestDb();

  it("returns scanned=0 removed=0 without throwing (ENOENT)", async () => {
    const nonExistentRoot = path.join(
      os.tmpdir(),
      `media-sweep-ghost-${Date.now()}`,
    );
    const result = await runMediaSweep({ root: nonExistentRoot, db });
    expect(result.scanned).toBe(0);
    expect(result.removed).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("runMediaSweep — DB failure swallow", () => {
  let root: string;

  beforeAll(async () => {
    root = await makeTempRoot("db-fail");
    // Put one plan directory in root — it should survive because DB query fails.
    await makePlanDir(root, "some-plan-id");
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("swallows DB error and returns removed=0 without throwing", async () => {
    // Provide a broken "db" whose .select chain throws.
    const brokenDb = {
      select: () => {
        throw new Error("DB connection lost");
      },
    };

    const result = await runMediaSweep({ root, db: brokenDb });
    // scanned reflects the FS read, but removed must be 0 (sweep aborted).
    expect(result.removed).toBe(0);
    // Directory must still exist (not removed).
    await expect(stat(path.join(root, "some-plan-id"))).resolves.toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("runMediaSweep — plain files in root are ignored", () => {
  const db = makeTestDb();
  let root: string;

  beforeAll(async () => {
    root = await makeTempRoot("files");
    // Write a .DS_Store file and a regular file at the root level — not dirs.
    await writeFile(path.join(root, ".DS_Store"), "");
    await writeFile(path.join(root, "stray.txt"), "content");
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("skips plain files (non-directories) without error", async () => {
    const result = await runMediaSweep({ root, db });
    // Both entries are files, not directories → scanned = 0.
    expect(result.scanned).toBe(0);
    expect(result.removed).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("runMediaSweep — dot-prefixed directories are preserved", () => {
  const db = makeTestDb();
  let root: string;

  beforeAll(async () => {
    root = await makeTempRoot("dotdirs");
    // Create a dot-prefixed directory — should be skipped even though it is
    // not in the plans table.
    await makePlanDir(root, ".cache");
    await makePlanDir(root, ".hidden-dir");
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("does not remove dot-prefixed directories", async () => {
    const result = await runMediaSweep({ root, db });

    expect(result.scanned).toBe(0);
    expect(result.removed).toBe(0);

    // Both dot-dirs must still exist.
    await expect(stat(path.join(root, ".cache"))).resolves.toBeDefined();
    await expect(stat(path.join(root, ".hidden-dir"))).resolves.toBeDefined();
  });
});
