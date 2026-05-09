import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import type { MediaRow, NewMediaRow } from "@/db/schema";
// Import schema objects from the schema-only module so that importing
// media-store in a bun:test context does NOT load client.ts (better-sqlite3).
// The production DB handle is accessed lazily via getDb() only when the
// module-level singleton is actually called.
import { media } from "@/db/schema";

// ─── Output types ─────────────────────────────────────────────────────────

// MediaRow + computed `useCount` from the refs graph.
// use_count = number of refs rows where kind='media' and dst_id='media:<id>'
// for the given plan. Kept as a plain intersection rather than a new nominal
// type so callers that only need MediaRow fields don't need casting.
export type MediaRowWithCount = MediaRow & { useCount: number };

// ─── Input types ──────────────────────────────────────────────────────────

export type CreateMediaInput = {
  planId: string;
  kind: NewMediaRow["kind"];
  mimeType: string;
  originalName: string;
  buffer: Buffer;
  // Optional provenance fields — set for external-URL fetches (PR-4)
  // and chat-attachment promotions (PR-6).
  sourceUrl?: string;
  sourceChatAttachmentId?: string;
  // Image dimensions — caller supplies if already extracted (PR-4 / sharp).
  width?: number;
  height?: number;
};

/**
 * Path-based variant of CreateMediaInput — used when promoting a chat
 * attachment to the media library (PR-6). The file is moved (renamed) from
 * the chat directory into the plan media directory atomically.
 */
export type CreateMediaFromPathInput = {
  planId: string;
  kind: NewMediaRow["kind"];
  mimeType: string;
  originalName: string;
  /** Actual byte count from fs.stat — used as sizeBytes in the DB row. */
  sizeBytes: number;
  /** Absolute path of the existing file in the chat upload directory. */
  sourcePath: string;
  sourceChatAttachmentId?: string;
  width?: number;
  height?: number;
};

// ─── Constants ────────────────────────────────────────────────────────────

export const LOCAL_MEDIA_ROOT = path.join(process.cwd(), "local-media");
export const MAX_MEDIA_BYTES = 50 * 1024 * 1024; // 50 MiB — same as chat uploads

// ─── Filename helpers ──────────────────────────────────────────────────────

const SAFE_NAME_RE = /[^a-zA-Z0-9._-]+/g;

/**
 * Strip path separators and unsafe chars from a user-supplied filename.
 * Mirrors the behavior of chat-uploads.ts sanitizeFilename.
 * Capped at 120 characters to keep storagePath manageable.
 */
export function sanitizeFilename(name: string): string {
  // Take only the basename — strip any directory component.
  const base = name.split(/[\\/]/).pop() ?? "file";
  const trimmed = base.replace(SAFE_NAME_RE, "_").slice(0, 120);
  return trimmed.length > 0 ? trimmed : "file";
}

// ─── Path helpers ──────────────────────────────────────────────────────────

/** Absolute path to the plan's media directory. */
export function localMediaDir(planId: string): string {
  return path.join(LOCAL_MEDIA_ROOT, planId);
}

/**
 * Resolve a media row's storagePath to an absolute filesystem path.
 * storagePath is always a bare filename (`<id>-<safeName>`), never a
 * relative or absolute path with slashes — this is enforced at write time.
 */
export function mediaAbsolutePath(planId: string, storagePath: string): string {
  return path.join(LOCAL_MEDIA_ROOT, planId, storagePath);
}

// ─── Kind classifier ──────────────────────────────────────────────────────

export function classifyMedia(
  mime: string,
): "image" | "video" | "audio" | "doc" | "other" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("text/")) return "doc";
  // Allowlist specific application subtypes that are document-like.
  if (
    mime === "application/pdf" ||
    mime === "application/json" ||
    mime === "application/xml" ||
    mime === "application/msword" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "application/vnd.ms-excel" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "application/vnd.ms-powerpoint" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  )
    return "doc";
  return "other";
}

// ─── ID generation ────────────────────────────────────────────────────────

function newMediaId(): string {
  // Prefixed UUID without dashes — consistent with chat-store.ts convention.
  return `med_${crypto.randomUUID().replace(/-/g, "")}`;
}

// ─── DB abstraction ───────────────────────────────────────────────────────
// Drizzle's DB type differs between better-sqlite3 and bun:sqlite adapters.
// We use a structural any to decouple this module from either adapter so that:
//  - Production: the caller gets the better-sqlite3 drizzle instance from @/db
//  - Tests: the caller passes a bun:sqlite drizzle instance via makeMediaStore()
// biome-ignore lint/suspicious/noExplicitAny: adapter-agnostic drizzle instance
type AnyDb = any;

/**
 * Factory that returns CRUD helpers bound to the given drizzle instance.
 * Use this in tests with a bun:sqlite-backed drizzle to avoid the
 * better-sqlite3 native binding requirement.
 *
 * @example
 * ```ts
 * import { Database } from "bun:sqlite";
 * import { drizzle } from "drizzle-orm/bun-sqlite";
 * const db = drizzle({ client: new Database(":memory:") });
 * const store = makeMediaStore(db);
 * ```
 */
export function makeMediaStore(db: AnyDb) {
  async function createMedia(input: CreateMediaInput): Promise<MediaRow> {
    if (input.buffer.byteLength > MAX_MEDIA_BYTES) {
      throw new Error(
        `File exceeds 50 MiB limit (${input.buffer.byteLength} bytes)`,
      );
    }

    const id = newMediaId();
    const safeName = sanitizeFilename(input.originalName);
    // storagePath is always a bare filename — no slashes — preventing path
    // traversal even if user input ever reaches this function by mistake.
    const storagePath = `${id}-${safeName}`;
    const absPath = mediaAbsolutePath(input.planId, storagePath);

    await mkdir(localMediaDir(input.planId), { recursive: true });
    await writeFile(absPath, input.buffer);

    const now = new Date();
    const row: NewMediaRow = {
      id,
      planId: input.planId,
      kind: input.kind,
      mimeType: input.mimeType,
      originalName: input.originalName,
      storagePath,
      sizeBytes: input.buffer.byteLength,
      width: input.width ?? null,
      height: input.height ?? null,
      sourceUrl: input.sourceUrl ?? null,
      sourceChatAttachmentId: input.sourceChatAttachmentId ?? null,
      createdAt: now,
    };

    // ── DB insert with rollback ───────────────────────────────────────────────
    // If the insert fails (e.g. FK violation, unique constraint), attempt to
    // remove the file we just wrote. Rollback is best-effort: if rm also fails,
    // warn and rethrow the original DB error — the orphan will be swept by the
    // media-sweep job.
    try {
      const [inserted] = db.insert(media).values(row).returning().all();
      return inserted as MediaRow;
    } catch (insertErr) {
      await rm(absPath, { force: true }).catch((rmErr) => {
        console.warn(
          `[media-store] createMedia rollback rm failed for ${absPath}:`,
          rmErr,
        );
      });
      throw insertErr;
    }
  }

  function getMedia(id: string): MediaRow | null {
    const row = db.select().from(media).where(eq(media.id, id)).get();
    return (row as MediaRow) ?? null;
  }

  function listByPlan(planId: string): MediaRowWithCount[] {
    // Raw SQL: LEFT JOIN the refs table to count blocks that reference each
    // media item (kind='media', dst_id='media:<id>'). The refs_plan_dst_idx
    // index covers (plan_id, dst_id) so the subquery is O(log n).
    //
    // We use db.$client.prepare() to access the underlying bun:sqlite or
    // better-sqlite3 statement directly, bypassing drizzle's ORM layer which
    // cannot express this LEFT JOIN + GROUP BY pattern cleanly.
    //
    // The AnyDb type covers both adapters:
    //  - bun:sqlite drizzle: db.$client is a bun:sqlite Database
    //  - better-sqlite3 drizzle: db.$client is a better-sqlite3 Database
    // Both expose a `.prepare(sql).all(...args)` interface.
    const sql = `
      SELECT
        m.id,
        m.plan_id        AS planId,
        m.kind,
        m.mime_type      AS mimeType,
        m.original_name  AS originalName,
        m.storage_path   AS storagePath,
        m.size_bytes     AS sizeBytes,
        m.width,
        m.height,
        m.source_url     AS sourceUrl,
        m.source_chat_attachment_id AS sourceChatAttachmentId,
        m.created_at     AS createdAt,
        COALESCE(c.cnt, 0) AS useCount
      FROM media m
      LEFT JOIN (
        SELECT dst_id, COUNT(*) AS cnt
        FROM refs
        WHERE plan_id = ? AND kind = 'media'
        GROUP BY dst_id
      ) c ON c.dst_id = 'media:' || m.id
      WHERE m.plan_id = ?
      ORDER BY m.created_at DESC
    `;
    const rows = db.$client.prepare(sql).all(planId, planId) as Array<
      Record<string, unknown>
    >;
    return rows.map((r) => ({
      id: r.id as string,
      planId: r.planId as string,
      kind: r.kind as MediaRow["kind"],
      mimeType: r.mimeType as string,
      originalName: r.originalName as string,
      storagePath: r.storagePath as string,
      sizeBytes: r.sizeBytes as number,
      width: (r.width as number | null) ?? null,
      height: (r.height as number | null) ?? null,
      sourceUrl: (r.sourceUrl as string | null) ?? null,
      sourceChatAttachmentId:
        (r.sourceChatAttachmentId as string | null) ?? null,
      createdAt: new Date(r.createdAt as number) as unknown as Date,
      useCount: r.useCount as number,
    })) as unknown as MediaRowWithCount[];
  }

  async function deleteMedia(id: string): Promise<boolean> {
    const row = getMedia(id);
    if (!row) return false;

    db.delete(media).where(eq(media.id, id)).run();

    // Best-effort — do not throw if file is already gone.
    const absPath = mediaAbsolutePath(row.planId, row.storagePath);
    await rm(absPath, { force: true });

    return true;
  }

  /**
   * Move (rename) an existing file from `input.sourcePath` into the plan's
   * media directory, then insert a DB row. Atomically safe on the same
   * filesystem (chat uploads and media live under the same repo root).
   *
   * Rollback policy:
   *   - If the DB insert fails, attempt to rename the file back to sourcePath.
   *   - If the rollback rename also fails the file is left at destPath (orphan)
   *     to be swept by PR-7; the original error is re-thrown.
   *   - If the initial rename fails the source file is untouched; throws.
   */
  async function createMediaFromPath(
    input: CreateMediaFromPathInput,
  ): Promise<MediaRow> {
    const id = newMediaId();
    const safeName = sanitizeFilename(input.originalName);
    const storagePath = `${id}-${safeName}`;
    const destDir = localMediaDir(input.planId);
    const absDestPath = path.join(destDir, storagePath);

    await mkdir(destDir, { recursive: true });

    // ── 1. Atomic move ────────────────────────────────────────────────────────
    await rename(input.sourcePath, absDestPath);

    // ── 2. DB insert ──────────────────────────────────────────────────────────
    const now = new Date();
    const row: NewMediaRow = {
      id,
      planId: input.planId,
      kind: input.kind,
      mimeType: input.mimeType,
      originalName: input.originalName,
      storagePath,
      sizeBytes: input.sizeBytes,
      width: input.width ?? null,
      height: input.height ?? null,
      sourceUrl: null,
      sourceChatAttachmentId: input.sourceChatAttachmentId ?? null,
      createdAt: now,
    };

    try {
      const [inserted] = db.insert(media).values(row).returning().all();
      return inserted as MediaRow;
    } catch (insertErr) {
      // Rollback: move file back to chat directory.
      try {
        await rename(absDestPath, input.sourcePath);
      } catch {
        // Rollback failed — orphan at destPath. PR-7 sweep will recover.
        // Do not swallow the original insert error.
      }
      throw insertErr;
    }
  }

  return {
    createMedia,
    createMediaFromPath,
    getMedia,
    listByPlan,
    deleteMedia,
  };
}

// ─── Production singletons ────────────────────────────────────────────────
// These are wired to the @/db singleton (better-sqlite3 drizzle). The
// require() call is intentionally deferred inside the function body so that
// merely importing media-store.ts does NOT trigger better-sqlite3 loading —
// which would crash bun test environments.

function lazyDb(): AnyDb {
  // @/db re-exports `db` from client.ts; client.ts is a singleton so this
  // require() is effectively free after the first call.
  // Intentional lazy require — avoids loading better-sqlite3 native binding
  // when media-store is imported in bun:test environments.
  // biome-ignore lint/suspicious/noExplicitAny: commonjs interop
  return (require("@/db") as any).db;
}

/**
 * Write a file to disk and insert a media row. Returns the inserted row.
 * Throws if buffer exceeds MAX_MEDIA_BYTES.
 */
export async function createMedia(input: CreateMediaInput): Promise<MediaRow> {
  return makeMediaStore(lazyDb()).createMedia(input);
}

/**
 * Move (rename) an existing file into the plan media directory and insert a
 * DB row. Atomic on the same filesystem. Rolls back the rename on DB failure.
 * Throws if the rename or DB insert fails.
 */
export async function createMediaFromPath(
  input: CreateMediaFromPathInput,
): Promise<MediaRow> {
  return makeMediaStore(lazyDb()).createMediaFromPath(input);
}

/** Look up a single media row by id. Returns null if not found. */
export function getMedia(id: string): MediaRow | null {
  return makeMediaStore(lazyDb()).getMedia(id);
}

/** List all media rows for a plan, newest first. Each row includes useCount. */
export function listByPlan(planId: string): MediaRowWithCount[] {
  return makeMediaStore(lazyDb()).listByPlan(planId);
}

/**
 * Delete a media row and best-effort remove the file from disk.
 * Idempotent: if the file is already missing, silently continues.
 * Returns true if a DB row was deleted, false if the id did not exist.
 */
export async function deleteMedia(id: string): Promise<boolean> {
  return makeMediaStore(lazyDb()).deleteMedia(id);
}

/**
 * Remove the entire plan media directory from disk.
 * Idempotent: no-op if the directory does not exist.
 * NOTE: DB rows are removed by ON DELETE CASCADE on plans.id.
 * Wire this call in project deletion (PR-7). Just exports the helper now.
 */
export async function deletePlanDir(planId: string): Promise<void> {
  await rm(localMediaDir(planId), { recursive: true, force: true });
}

// ─── Shared media validation helper (used by upload route + from-url route) ──

export type ValidatedMediaMeta = {
  mimeType: string;
  kind: ReturnType<typeof classifyMedia>;
  width?: number;
  height?: number;
};

export type MediaValidationError =
  | { code: "UNSUPPORTED_MIME"; message: string }
  | { code: "MIME_MISMATCH"; message: string }
  | { code: "SVG_SCRIPT"; message: string };

/**
 * Inspect a raw buffer and return the authoritative mime type, kind, and
 * optional image dimensions.
 *
 * Validation steps:
 *  1. Magic-byte sniff via `file-type`.
 *  2. Allowlist check against ALLOWED_MEDIA_MIMES.
 *  3. For SVG: `<script` injection guard.
 *  4. Best-effort raster dimension extraction via `image-size`.
 *
 * Throws a `MediaValidationError` (discriminated union, not Error subclass)
 * so callers can branch on `code` without instanceof checks.
 *
 * @param buffer  - Full file buffer (or at least the first 4 KB for sniff).
 * @param declaredMime - Optional hint from Content-Type header. When `file-type`
 *                        detects a type it always takes precedence.
 */
export async function validateAndClassifyMediaBuffer(
  buffer: Buffer,
  declaredMime?: string,
): Promise<ValidatedMediaMeta> {
  // ── 1. Magic-byte sniff ──────────────────────────────────────────────────
  const { fileTypeFromBuffer } = await import("file-type");
  const slice = buffer.subarray(0, 4096);
  const detected = await fileTypeFromBuffer(slice);

  // Authority rule: detected type wins; fall back to declaredMime; last resort
  // is "application/octet-stream" which will fail the allowlist check below.
  let mimeType = detected?.mime ?? declaredMime ?? "application/octet-stream";

  // If file-type returned a result but it conflicts with the declared type,
  // that is a MIME_MISMATCH only when declaredMime was explicitly provided and
  // is not a wildcard. We trust magic bytes unconditionally here — the upstream
  // caller may rely on this to reject spoofed Content-Type headers.
  if (detected && declaredMime && detected.mime !== declaredMime) {
    // For the from-url route the `declaredMime` is the remote Content-Type.
    // We still use magic bytes as authority (per spec), so just overwrite.
    mimeType = detected.mime;
  }

  // ── 2. Allowlist ─────────────────────────────────────────────────────────
  if (!ALLOWED_MEDIA_MIMES.has(mimeType)) {
    const err: MediaValidationError = {
      code: "UNSUPPORTED_MIME",
      message: `Unsupported media type: ${mimeType}`,
    };
    throw err;
  }

  // ── 3. SVG script guard ──────────────────────────────────────────────────
  if (mimeType === "image/svg+xml") {
    const text = buffer.toString("utf-8");
    if (/<script/i.test(text)) {
      const err: MediaValidationError = {
        code: "SVG_SCRIPT",
        message: "SVG files must not contain <script> elements",
      };
      throw err;
    }
  }

  const kind = classifyMedia(mimeType);

  // ── 4. Raster dimensions (best-effort) ───────────────────────────────────
  const RASTER_MIMES = new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/avif",
  ]);
  let width: number | undefined;
  let height: number | undefined;
  if (RASTER_MIMES.has(mimeType)) {
    try {
      const { imageSize } = await import("image-size");
      const dims = imageSize(buffer);
      if (dims.width && dims.height) {
        width = dims.width;
        height = dims.height;
      }
    } catch {
      // best-effort — leave undefined
    }
  }

  return { mimeType, kind, width, height };
}

/**
 * Mime types permitted for media storage.
 * Mirrors the ALLOWED_MIMES set in the upload route — kept in sync here
 * so both routes share one authoritative list.
 */
export const ALLOWED_MEDIA_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "application/pdf",
]);
