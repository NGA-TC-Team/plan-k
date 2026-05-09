/**
 * Integration tests for media-store.ts (makeMediaStore factory).
 *
 * DB isolation: uses bun:sqlite (native to Bun) + drizzle-orm/bun-sqlite
 * with an in-memory database to avoid the better-sqlite3 native-binding
 * requirement that prevents bun from running @/db in test mode.
 *
 * The makeMediaStore() factory accepts any drizzle instance, so we inject
 * a test-scoped in-memory DB and run the full migration SQL to get a
 * realistic schema without touching local.db.
 */

import { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "@/db/schema";

// ─── Test DB setup ─────────────────────────────────────────────────────────

function makeTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.run("PRAGMA foreign_keys = ON");
  const db = drizzle({ client: sqlite, schema });
  migrate(db, {
    migrationsFolder: path.join(process.cwd(), "drizzle"),
  });
  return db;
}

// ─── Import media-store with test DB ──────────────────────────────────────

import {
  classifyMedia,
  deletePlanDir,
  LOCAL_MEDIA_ROOT,
  localMediaDir,
  MAX_MEDIA_BYTES,
  makeMediaStore,
  sanitizeFilename,
} from "./media-store";

// ─── Helpers ───────────────────────────────────────────────────────────────

function testPlanId(): string {
  return `test-media-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

/** Insert a minimal plans row so FK constraints pass. */
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

async function cleanupDir(planId: string): Promise<void> {
  await rm(localMediaDir(planId), { recursive: true, force: true });
}

// ─── sanitizeFilename ──────────────────────────────────────────────────────

describe("sanitizeFilename", () => {
  it("strips directory components, keeping only basename", () => {
    // "../../etc/passwd" → basename is "passwd" (only last segment kept)
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
  });

  it("replaces unsafe chars with underscores", () => {
    // Space and parens are each one unsafe run → one underscore each
    expect(sanitizeFilename("my file (1).png")).toBe("my_file_1_.png");
  });

  it("caps at 120 characters", () => {
    const long = `${"a".repeat(200)}.png`;
    expect(sanitizeFilename(long).length).toBeLessThanOrEqual(120);
  });

  it("returns 'file' for empty input", () => {
    expect(sanitizeFilename("")).toBe("file");
  });

  it("takes basename when full path is given", () => {
    expect(sanitizeFilename("/home/user/logo.png")).toBe("logo.png");
    expect(sanitizeFilename("C:\\Users\\khan\\logo.png")).toBe("logo.png");
  });
});

// ─── createMedia ──────────────────────────────────────────────────────────

describe("createMedia", () => {
  const db = makeTestDb();
  const store = makeMediaStore(db);
  let planId: string;

  beforeAll(() => {
    planId = testPlanId();
    seedPlan(db, planId);
  });

  afterAll(async () => {
    await cleanupDir(planId);
  });

  it("writes the file at the expected absolute path", async () => {
    const buffer = Buffer.from("fake-png-bytes");
    const row = await store.createMedia({
      planId,
      kind: "image",
      mimeType: "image/png",
      originalName: "logo.png",
      buffer,
    });

    const absPath = path.join(LOCAL_MEDIA_ROOT, planId, row.storagePath);
    const s = await stat(absPath);
    expect(s.isFile()).toBe(true);
  });

  it("inserts a DB row with sanitized storagePath (no slashes)", async () => {
    const buffer = Buffer.from("data");
    const row = await store.createMedia({
      planId,
      kind: "image",
      mimeType: "image/png",
      originalName: "../../evil/path.png",
      buffer,
    });

    expect(row.storagePath).not.toContain("/");
    expect(row.storagePath).not.toContain("\\");
    expect(row.planId).toBe(planId);
  });

  it("stores sizeBytes matching buffer length", async () => {
    const buffer = Buffer.alloc(512, 0xff);
    const row = await store.createMedia({
      planId,
      kind: "doc",
      mimeType: "application/pdf",
      originalName: "report.pdf",
      buffer,
    });

    expect(row.sizeBytes).toBe(512);
  });

  it("throws when buffer exceeds MAX_MEDIA_BYTES", async () => {
    // Fake large buffer — avoid actually allocating 50 MiB.
    const fakeBuffer = { byteLength: MAX_MEDIA_BYTES + 1 } as unknown as Buffer;

    await expect(
      store.createMedia({
        planId,
        kind: "image",
        mimeType: "image/png",
        originalName: "huge.png",
        buffer: fakeBuffer,
      }),
    ).rejects.toThrow("50 MiB");
  });
});

// ─── getMedia ─────────────────────────────────────────────────────────────

describe("getMedia", () => {
  const db = makeTestDb();
  const store = makeMediaStore(db);
  let planId: string;

  beforeAll(() => {
    planId = testPlanId();
    seedPlan(db, planId);
  });

  afterAll(async () => {
    await cleanupDir(planId);
  });

  it("returns null for a missing id", () => {
    expect(store.getMedia("nonexistent-id")).toBeNull();
  });

  it("returns the row after createMedia", async () => {
    const row = await store.createMedia({
      planId,
      kind: "image",
      mimeType: "image/jpeg",
      originalName: "photo.jpg",
      buffer: Buffer.from("jpg-data"),
    });

    const fetched = store.getMedia(row.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(row.id);
    expect(fetched?.planId).toBe(planId);
  });
});

// ─── listByPlan ───────────────────────────────────────────────────────────

describe("listByPlan", () => {
  const db = makeTestDb();
  const store = makeMediaStore(db);
  let planId: string;

  beforeAll(() => {
    planId = testPlanId();
    seedPlan(db, planId);
  });

  afterAll(async () => {
    await cleanupDir(planId);
  });

  it("returns rows newest-first", async () => {
    const t0 = new Date(Date.now() - 2000);
    const t1 = new Date(Date.now() - 1000);

    // Insert rows with explicit, distinct createdAt values via direct DB insert
    // to guarantee ordering regardless of wall-clock resolution.
    const idA = `med_aaa${Date.now()}`;
    const idB = `med_bbb${Date.now()}`;
    db.insert(schema.media)
      .values({
        id: idA,
        planId,
        kind: "image",
        mimeType: "image/png",
        originalName: "a.png",
        storagePath: `${idA}-a.png`,
        sizeBytes: 1,
        createdAt: t0,
      })
      .run();
    db.insert(schema.media)
      .values({
        id: idB,
        planId,
        kind: "image",
        mimeType: "image/png",
        originalName: "b.png",
        storagePath: `${idB}-b.png`,
        sizeBytes: 1,
        createdAt: t1,
      })
      .run();

    const rows = store.listByPlan(planId);
    const ids = rows.map((r) => r.id);
    // idB has a later createdAt, so it should appear before idA.
    expect(ids.indexOf(idB)).toBeLessThan(ids.indexOf(idA));
  });
});

// ─── deleteMedia ──────────────────────────────────────────────────────────

describe("deleteMedia", () => {
  const db = makeTestDb();
  const store = makeMediaStore(db);
  let planId: string;

  beforeAll(() => {
    planId = testPlanId();
    seedPlan(db, planId);
  });

  afterAll(async () => {
    await cleanupDir(planId);
  });

  it("removes the DB row and the file", async () => {
    const row = await store.createMedia({
      planId,
      kind: "image",
      mimeType: "image/png",
      originalName: "delete-me.png",
      buffer: Buffer.from("bytes"),
    });

    const absPath = path.join(LOCAL_MEDIA_ROOT, planId, row.storagePath);
    const deleted = await store.deleteMedia(row.id);
    expect(deleted).toBe(true);
    expect(store.getMedia(row.id)).toBeNull();
    await expect(stat(absPath)).rejects.toThrow();
  });

  it("is idempotent when file is already gone from disk", async () => {
    const row = await store.createMedia({
      planId,
      kind: "image",
      mimeType: "image/png",
      originalName: "half-deleted.png",
      buffer: Buffer.from("data"),
    });
    const absPath = path.join(LOCAL_MEDIA_ROOT, planId, row.storagePath);

    // Manually remove file from disk, leaving DB row intact.
    await rm(absPath, { force: true });

    // deleteMedia must not throw even though file is missing.
    const result = await store.deleteMedia(row.id);
    expect(result).toBe(true);
    expect(store.getMedia(row.id)).toBeNull();
  });

  it("returns false for a non-existent id", async () => {
    expect(await store.deleteMedia("does-not-exist")).toBe(false);
  });
});

// ─── deletePlanDir ────────────────────────────────────────────────────────

describe("deletePlanDir", () => {
  it("is idempotent on a non-existent directory", async () => {
    const fakePlanId = `ghost-plan-${Date.now()}`;
    await expect(deletePlanDir(fakePlanId)).resolves.toBeUndefined();
  });

  it("removes the directory when it exists", async () => {
    const planId = `dir-test-${Date.now()}`;
    const dir = localMediaDir(planId);
    await mkdir(dir, { recursive: true });

    await deletePlanDir(planId);

    await expect(stat(dir)).rejects.toThrow();
  });
});

// ─── listByPlan (useCount) ────────────────────────────────────────────────

describe("listByPlan — useCount from refs graph", () => {
  const db = makeTestDb();
  const store = makeMediaStore(db);
  let planId: string;

  beforeAll(() => {
    planId = testPlanId();
    seedPlan(db, planId);
  });

  afterAll(async () => {
    await cleanupDir(planId);
  });

  /** Insert a media row directly (no disk write) for count tests. */
  function seedMedia(id: string, name: string) {
    db.insert(schema.media)
      .values({
        id,
        planId,
        kind: "image" as const,
        mimeType: "image/png",
        originalName: name,
        storagePath: `${id}-${name}`,
        sizeBytes: 1,
        createdAt: new Date(),
      })
      .run();
  }

  /** Insert a refs row representing a block referencing a media item. */
  function seedMediaRef(srcBlockId: string, mediaId: string) {
    const dstId = `media:${mediaId}`;
    db.insert(schema.refs)
      .values({
        id: `${srcBlockId}::media::${dstId}`,
        planId,
        srcId: srcBlockId,
        dstId,
        kind: "media" as const,
        createdAt: new Date(),
      })
      .run();
  }

  it("unused media item has useCount = 0", () => {
    const id = `med_unused_${Date.now()}`;
    seedMedia(id, "unused.png");

    const rows = store.listByPlan(planId);
    const row = rows.find((r) => r.id === id);
    expect(row).toBeDefined();
    expect(row?.useCount).toBe(0);
  });

  it("media referenced by two blocks has useCount = 2", () => {
    const mediaId = `med_shared_${Date.now()}`;
    seedMedia(mediaId, "shared.png");
    seedMediaRef(`block_a_${Date.now()}`, mediaId);
    seedMediaRef(`block_b_${Date.now()}`, mediaId);

    const rows = store.listByPlan(planId);
    const row = rows.find((r) => r.id === mediaId);
    expect(row).toBeDefined();
    expect(row?.useCount).toBe(2);
  });

  it("media referenced by one block has useCount = 1", () => {
    const mediaId = `med_single_${Date.now()}`;
    seedMedia(mediaId, "single.png");
    seedMediaRef(`block_c_${Date.now()}`, mediaId);

    const rows = store.listByPlan(planId);
    const row = rows.find((r) => r.id === mediaId);
    expect(row?.useCount).toBe(1);
  });
});

// ─── classifyMedia ────────────────────────────────────────────────────────

describe("classifyMedia", () => {
  it("classifies image mimes", () => {
    expect(classifyMedia("image/png")).toBe("image");
    expect(classifyMedia("image/jpeg")).toBe("image");
    expect(classifyMedia("image/webp")).toBe("image");
  });

  it("classifies video mimes", () => {
    expect(classifyMedia("video/mp4")).toBe("video");
  });

  it("classifies audio mimes", () => {
    expect(classifyMedia("audio/mpeg")).toBe("audio");
  });

  it("classifies doc mimes", () => {
    expect(classifyMedia("application/pdf")).toBe("doc");
    expect(classifyMedia("text/plain")).toBe("doc");
  });

  it("falls back to other", () => {
    expect(classifyMedia("application/x-msdownload")).toBe("other");
  });
});
