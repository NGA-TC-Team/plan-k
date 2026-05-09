import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import { inArray } from "drizzle-orm";
// Import schema objects from the schema-only module so that importing
// media-sweep in a bun:test context does NOT load client.ts (better-sqlite3).
import { plans } from "@/db/schema";
import { LOCAL_MEDIA_ROOT } from "./media-store";

// ─── Public interval constant ─────────────────────────────────────────────

export const MEDIA_SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

// ─── DB abstraction ───────────────────────────────────────────────────────
// Same adapter-agnostic pattern as media-store.ts — decouples from both
// better-sqlite3 and bun:sqlite drizzle adapters.
// biome-ignore lint/suspicious/noExplicitAny: adapter-agnostic drizzle instance
type AnyDb = any;

// ─── Return type ──────────────────────────────────────────────────────────

export type MediaSweepResult = {
  scanned: number;
  removed: number;
};

// ─── Options ──────────────────────────────────────────────────────────────

export type MediaSweepOptions = {
  /**
   * Override LOCAL_MEDIA_ROOT for dependency injection in tests.
   * Defaults to the module-level LOCAL_MEDIA_ROOT constant.
   */
  root?: string;
  /**
   * Override the drizzle DB instance for dependency injection in tests.
   * Defaults to the lazily-loaded production @/db singleton.
   */
  db?: AnyDb;
};

// ─── Core sweep logic ─────────────────────────────────────────────────────

/**
 * Scan local-media/* for orphan planId directories (not present in the plans
 * table) and remove them. Idempotent — safe to call on boot and on a
 * recurring interval.
 *
 * Partial-failure policy: DB query failure swallows + warns, skips this run.
 * Individual rm failures are logged and do not abort remaining deletions.
 *
 * @param opts - Optional root/db overrides for test isolation.
 */
export async function runMediaSweep(
  opts: MediaSweepOptions = {},
): Promise<MediaSweepResult> {
  const root = opts.root ?? LOCAL_MEDIA_ROOT;
  const db: AnyDb = opts.db ?? lazyDb();

  // ── 1. Read local-media/ directory ─────────────────────────────────────
  let entries: string[];
  try {
    const dirents = await readdir(root, { withFileTypes: true });
    // Collect only non-hidden directories (skip dotfiles and plain files).
    entries = dirents
      .filter(
        (d) => d.isDirectory() && d.name.length > 0 && !d.name.startsWith("."),
      )
      .map((d) => d.name);
  } catch (err) {
    // Directory doesn't exist yet — nothing to sweep.
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return { scanned: 0, removed: 0 };
    // Unexpected error — log and bail so caller is informed.
    console.warn("[media-sweep] failed to read media root:", err);
    return { scanned: 0, removed: 0 };
  }

  if (entries.length === 0) return { scanned: 0, removed: 0 };

  // ── 2. Fetch valid planIds from DB ──────────────────────────────────────
  let validIds: Set<string>;
  try {
    const rows: Array<{ id: string }> = db
      .select({ id: plans.id })
      .from(plans)
      .where(inArray(plans.id, entries))
      .all();
    validIds = new Set(rows.map((r: { id: string }) => r.id));
  } catch (err) {
    // DB failure — swallow and skip this sweep cycle.
    console.warn("[media-sweep] DB query failed, skipping sweep:", err);
    return { scanned: entries.length, removed: 0 };
  }

  // ── 3. Remove orphan directories ────────────────────────────────────────
  const orphans = entries.filter((id) => !validIds.has(id));
  let removed = 0;

  for (const orphanId of orphans) {
    const orphanDir = path.join(root, orphanId);
    try {
      await rm(orphanDir, { recursive: true, force: true });
      removed += 1;
    } catch (err) {
      // Per-entry failure — log and continue. Partial success is acceptable.
      console.warn(
        `[media-sweep] failed to remove orphan dir ${orphanDir}:`,
        err,
      );
    }
  }

  if (removed > 0) {
    console.info(
      `[media-sweep] removed ${removed} orphan director${removed === 1 ? "y" : "ies"} (scanned ${entries.length})`,
    );
  }

  return { scanned: entries.length, removed };
}

// ─── Timer management ─────────────────────────────────────────────────────

let sweepTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Register the 6-hour sweep interval. If already registered, returns the
 * existing stop function (noop registration). An initial sweep fires
 * immediately on boot — same pattern as startChatSweepTimer.
 *
 * @returns A stop function that clears the interval.
 */
export function startMediaSweep(): () => void {
  if (sweepTimer) {
    return () => {
      if (sweepTimer) {
        clearInterval(sweepTimer);
        sweepTimer = null;
      }
    };
  }

  // Fire once immediately on boot so orphans from a previous crash are cleaned
  // before the first 6-hour window elapses.
  void runMediaSweep().then((res) => {
    if (res.removed > 0) {
      console.info(
        `[media-sweep] boot sweep removed ${res.removed} orphan director${res.removed === 1 ? "y" : "ies"}`,
      );
    }
  });

  sweepTimer = setInterval(() => {
    void runMediaSweep();
  }, MEDIA_SWEEP_INTERVAL_MS);

  // Unref so the timer does not prevent process exit — same as chat-sweep.
  if (typeof sweepTimer.unref === "function") sweepTimer.unref();

  return () => {
    if (sweepTimer) {
      clearInterval(sweepTimer);
      sweepTimer = null;
    }
  };
}

// ─── Production lazy DB ───────────────────────────────────────────────────
// Intentional lazy require — avoids loading better-sqlite3 native binding
// when media-sweep is imported in bun:test environments.

function lazyDb(): AnyDb {
  // biome-ignore lint/suspicious/noExplicitAny: commonjs interop
  return (require("@/db") as any).db;
}
