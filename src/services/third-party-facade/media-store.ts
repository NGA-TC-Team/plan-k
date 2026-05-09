import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { desc, eq } from "drizzle-orm";
import type { MediaRow, NewMediaRow } from "@/db/schema";
// Import schema objects from the schema-only module so that importing
// media-store in a bun:test context does NOT load client.ts (better-sqlite3).
// The production DB handle is accessed lazily via getDb() only when the
// module-level singleton is actually called.
import { media } from "@/db/schema";

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

    const [inserted] = db.insert(media).values(row).returning().all();
    return inserted as MediaRow;
  }

  function getMedia(id: string): MediaRow | null {
    const row = db.select().from(media).where(eq(media.id, id)).get();
    return (row as MediaRow) ?? null;
  }

  function listByPlan(planId: string): MediaRow[] {
    return db
      .select()
      .from(media)
      .where(eq(media.planId, planId))
      .orderBy(desc(media.createdAt))
      .all() as MediaRow[];
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

  return { createMedia, getMedia, listByPlan, deleteMedia };
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

/** Look up a single media row by id. Returns null if not found. */
export function getMedia(id: string): MediaRow | null {
  return makeMediaStore(lazyDb()).getMedia(id);
}

/** List all media rows for a plan, newest first. */
export function listByPlan(planId: string): MediaRow[] {
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
