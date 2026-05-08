import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

// Local-only filesystem layout for chat attachments. Files live under
// `<repo>/local-uploads/<sessionId>/<uuid>-<safeName>` so a session delete
// can be a single recursive rm. Path is gitignored.

export const UPLOAD_ROOT = path.join(process.cwd(), "local-uploads");
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MiB

const SAFE_NAME_RE = /[^a-zA-Z0-9._-]+/g;

export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const trimmed = base.replace(SAFE_NAME_RE, "_").slice(0, 120);
  return trimmed.length > 0 ? trimmed : "file";
}

export async function ensureSessionDir(sessionId: string): Promise<string> {
  const dir = path.join(UPLOAD_ROOT, sessionId);
  await mkdir(dir, { recursive: true });
  return dir;
}

export function buildStoragePath(
  sessionId: string,
  filename: string,
): { absolute: string; relative: string; storedName: string } {
  const safe = sanitizeFilename(filename);
  const id = crypto.randomUUID().replace(/-/g, "");
  const storedName = `${id}-${safe}`;
  const absolute = path.join(UPLOAD_ROOT, sessionId, storedName);
  const relative = path.join("local-uploads", sessionId, storedName);
  return { absolute, relative, storedName };
}

// Resolve an attachment path safely — must stay inside UPLOAD_ROOT to
// prevent path traversal via a forged storage_path row.
export function resolveAttachmentPath(
  sessionId: string,
  storedName: string,
): string | null {
  if (!/^[a-zA-Z0-9_]+$/.test(sessionId)) return null;
  if (storedName.includes("/") || storedName.includes("\\")) return null;
  const resolved = path.resolve(UPLOAD_ROOT, sessionId, storedName);
  const root = path.resolve(UPLOAD_ROOT);
  if (!resolved.startsWith(`${root}${path.sep}`)) return null;
  return resolved;
}

export async function deleteSessionDir(sessionId: string): Promise<void> {
  const dir = path.join(UPLOAD_ROOT, sessionId);
  await rm(dir, { recursive: true, force: true });
}

export function classifyAttachment(
  mime: string,
): "image" | "doc" | "video" | "audio" | "other" {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (
    mime === "application/pdf" ||
    mime === "application/json" ||
    mime.startsWith("text/") ||
    mime.startsWith("application/")
  )
    return "doc";
  return "other";
}
