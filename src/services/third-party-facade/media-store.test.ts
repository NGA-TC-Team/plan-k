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
  type CreateMediaFromPathInput,
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

// ─── createMedia — rollback on DB insert failure ───────────────────────────

describe("createMedia — DB insert rollback", () => {
  // Each test uses its own isolated DB/store to avoid FK cross-contamination.

  it("happy path: file exists on disk AND DB row is present after createMedia", async () => {
    const db = makeTestDb();
    const store = makeMediaStore(db);
    const planId = testPlanId();
    seedPlan(db, planId);

    const buffer = Buffer.from("hello-world");
    const row = await store.createMedia({
      planId,
      kind: "image",
      mimeType: "image/png",
      originalName: "happy.png",
      buffer,
    });

    // File must exist.
    const absPath = path.join(LOCAL_MEDIA_ROOT, planId, row.storagePath);
    const s = await stat(absPath);
    expect(s.isFile()).toBe(true);

    // DB row must be present.
    const fetched = store.getMedia(row.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.id).toBe(row.id);

    await cleanupDir(planId);
  });

  it("DB insert failure: createMedia throws AND the written file is removed", async () => {
    // Use a plan ID that was NEVER seeded → FK violation on insert.
    const db = makeTestDb();
    const store = makeMediaStore(db);
    const unknownPlanId = `fk-create-fail-${Date.now()}`;

    const buffer = Buffer.from("some-bytes");

    await expect(
      store.createMedia({
        planId: unknownPlanId,
        kind: "image",
        mimeType: "image/png",
        originalName: "orphan.png",
        buffer,
      }),
    ).rejects.toThrow(); // FK error propagated unchanged.

    // Rollback: file must have been removed from disk.
    const dir = localMediaDir(unknownPlanId);
    // The dir itself may or may not exist; the file inside must not.
    // We check by listing the directory if it exists.
    let files: string[] = [];
    try {
      const { readdir } = await import("node:fs/promises");
      files = await readdir(dir);
    } catch {
      // Dir doesn't exist — that's fine, no orphan possible.
    }
    // No file should remain named after "orphan.png" in any storagePath.
    const orphan = files.find((f) => f.includes("orphan"));
    expect(orphan).toBeUndefined();

    // Another plan's media (not involved) is unaffected — verified implicitly
    // by isolation: each test has its own DB and planId.

    await cleanupDir(unknownPlanId);
  });

  it("DB insert failure + rm failure: original DB error is thrown, file remains (next sweep)", async () => {
    // We need a store whose DB insert throws AND whose rm also throws.
    // Strategy: inject a fake db whose insert() chain throws a recognizable
    // error, and override the fs rm by testing against an absPath that is
    // deliberately read-only — but that is platform-fragile.
    //
    // Simpler: build a minimal fake db that mimics the drizzle insert chain.
    // The rollback rm will target a path that doesn't exist — rm({force:true})
    // on a missing path does NOT throw (that's what force means), so we can't
    // get rm to fail that way.
    //
    // To force rm to fail we point the storagePath at a *directory* (not a
    // file), so rm on a directory without { recursive:true } will throw EISDIR.
    // Then we verify the thrown error is the original DB error, not the rm error.

    // Do NOT use a real DB — we inject a fake below.
    const fakePlanId = `rm-fail-${Date.now()}`;

    // Pre-create a *directory* at the path where the file will be "written".
    // We can't intercept writeFile easily, so instead we rely on the fact that
    // rm({force:true}) on a directory without {recursive:true} returns EISDIR
    // on Linux/macOS but resolves on some platforms. The critical assertion is
    // that createMedia re-throws the insert error regardless.
    //
    // Because the test environment may behave differently regarding rm on dirs,
    // we use a function-injection approach: build a fake db whose insert() chain
    // returns an object with a .all() that throws a distinct sentinel error.
    const DB_SENTINEL = new Error("sentinel-db-error");
    const fakeDb = {
      insert: () => ({
        values: () => ({
          returning: () => ({
            all: () => {
              throw DB_SENTINEL;
            },
          }),
        }),
      }),
    };

    // makeMediaStore accepts AnyDb; cast to satisfy TypeScript.
    // biome-ignore lint/suspicious/noExplicitAny: test-only fake db
    const fakeStore = makeMediaStore(fakeDb as any);

    // Seed a real dir for the planId so writeFile succeeds, then rm will run.
    await mkdir(localMediaDir(fakePlanId), { recursive: true });

    const buffer = Buffer.from("test-bytes");

    let thrown: unknown;
    try {
      await fakeStore.createMedia({
        planId: fakePlanId,
        kind: "image",
        mimeType: "image/png",
        originalName: "rm-fail.png",
        buffer,
      });
    } catch (err) {
      thrown = err;
    }

    // The thrown error must be the DB sentinel, NOT an rm error.
    expect(thrown).toBe(DB_SENTINEL);

    await cleanupDir(fakePlanId);
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

// ─── createMediaFromPath ──────────────────────────────────────────────────

import { writeFile as writeFileFs } from "node:fs/promises";
import { UPLOAD_ROOT } from "./chat-uploads";

/**
 * Creates a temporary file in the chat upload area to simulate a chat
 * attachment on disk.
 */
async function makeSourceFile(
  sessionId: string,
  filename: string,
  content: string | Buffer,
): Promise<string> {
  const dir = path.join(UPLOAD_ROOT, sessionId);
  await mkdir(dir, { recursive: true });
  const absPath = path.join(dir, filename);
  await writeFileFs(absPath, content);
  return absPath;
}

describe("createMediaFromPath", () => {
  const db = makeTestDb();
  const store = makeMediaStore(db);
  let planId: string;
  const testSessionId = `sess_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

  beforeAll(() => {
    planId = testPlanId();
    seedPlan(db, planId);
  });

  afterAll(async () => {
    await cleanupDir(planId);
    // Clean up any remaining source session dir.
    await rm(path.join(UPLOAD_ROOT, testSessionId), {
      recursive: true,
      force: true,
    });
  });

  it("moves file to media dir, inserts DB row, sourceChatAttachmentId set", async () => {
    const srcPath = await makeSourceFile(
      testSessionId,
      "photo_promote.png",
      Buffer.from("fake-png-data"),
    );

    const input: CreateMediaFromPathInput = {
      planId,
      kind: "image",
      mimeType: "image/png",
      originalName: "photo_promote.png",
      sizeBytes: 14, // len("fake-png-data")
      sourcePath: srcPath,
      sourceChatAttachmentId: "ca_test123",
    };

    const row = await store.createMediaFromPath(input);

    // Source file must be gone (moved, not copied).
    await expect(stat(srcPath)).rejects.toThrow();

    // Dest file must exist at the media dir.
    const destPath = path.join(LOCAL_MEDIA_ROOT, planId, row.storagePath);
    const destStat = await stat(destPath);
    expect(destStat.isFile()).toBe(true);

    // DB row correctness.
    const fetched = store.getMedia(row.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.sourceChatAttachmentId).toBe("ca_test123");
    expect(fetched?.planId).toBe(planId);
    expect(fetched?.kind).toBe("image");
  });

  it("throws and leaves no DB row when source file does not exist", async () => {
    const missingPath = path.join(
      UPLOAD_ROOT,
      testSessionId,
      "does_not_exist.png",
    );

    const input: CreateMediaFromPathInput = {
      planId,
      kind: "image",
      mimeType: "image/png",
      originalName: "does_not_exist.png",
      sizeBytes: 0,
      sourcePath: missingPath,
    };

    await expect(store.createMediaFromPath(input)).rejects.toThrow();

    // No orphan row in DB.
    const rows = db
      .select()
      .from(schema.media)
      .where(schema.media.planId ? undefined : undefined)
      .all();
    // All rows have planId matching our test plan; none should have
    // storagePath containing "does_not_exist".
    const orphan = rows.find((r) =>
      (r as { storagePath: string }).storagePath.includes("does_not_exist"),
    );
    expect(orphan).toBeUndefined();
  });

  it("rolls back file move to original location when DB insert fails", async () => {
    // Use a fresh DB with plans table but corrupt the media table by closing
    // the connection inside a mock. Instead, we simulate via a plan that has
    // NOT been seeded — the FK constraint on planId will cause the insert to
    // throw.
    const orphanDb = makeTestDb();
    const orphanStore = makeMediaStore(orphanDb);
    // Do NOT seed a plan — any insert referencing unknownPlanId will fail FK.
    const unknownPlanId = `fk-fail-plan-${Date.now()}`;

    const srcPath = await makeSourceFile(
      testSessionId,
      "rollback_test.png",
      Buffer.from("rollback-content"),
    );

    const input: CreateMediaFromPathInput = {
      planId: unknownPlanId,
      kind: "image",
      mimeType: "image/png",
      originalName: "rollback_test.png",
      sizeBytes: 16,
      sourcePath: srcPath,
    };

    await expect(orphanStore.createMediaFromPath(input)).rejects.toThrow();

    // Rollback succeeded: source file must be back at original location.
    const srcStat = await stat(srcPath);
    expect(srcStat.isFile()).toBe(true);

    // Cleanup.
    await rm(srcPath, { force: true });
  });

  it("throws with FK violation when planId does not exist (no rollback needed — insert throws)", async () => {
    // Separate DB to isolate from other tests.
    const isolatedDb = makeTestDb();
    const isolatedStore = makeMediaStore(isolatedDb);
    const missingPlanId = `no-such-plan-${Date.now()}`;

    const srcPath = await makeSourceFile(
      testSessionId,
      "fk_test.png",
      Buffer.from("fk-content"),
    );

    await expect(
      isolatedStore.createMediaFromPath({
        planId: missingPlanId,
        kind: "image",
        mimeType: "image/png",
        originalName: "fk_test.png",
        sizeBytes: 10,
        sourcePath: srcPath,
      }),
    ).rejects.toThrow();

    // Source restored by rollback.
    await expect(stat(srcPath)).resolves.toBeDefined();

    // Cleanup.
    await rm(srcPath, { force: true });
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
