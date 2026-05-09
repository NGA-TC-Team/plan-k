/**
 * Plan version snapshot facade.
 *
 * Pattern: lazy getDb() — schema objects imported from @/db/schema (not the
 * barrel) so that importing this file in bun:test does NOT trigger
 * better-sqlite3 binding. mock.module("@/db", ...) applied before the first
 * call can substitute an in-memory DB.
 */

import { desc, eq } from "drizzle-orm";
import { type PlanVersionRow, planVersions } from "@/db/schema";

// biome-ignore lint/suspicious/noExplicitAny: adapter-agnostic drizzle instance
type AnyDb = any;

// Lazy DB accessor — returns the in-memory mock during bun:test, or the
// production better-sqlite3 singleton in normal operation.
function getDb(): AnyDb {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require("@/db") as { db: AnyDb }).db;
}

// ─── Error class ─────────────────────────────────────────────────────────────

export class PlanVersionError extends Error {
  readonly code: "INVALID_LABEL" | "NOT_FOUND";

  constructor(code: "INVALID_LABEL" | "NOT_FOUND", message?: string) {
    super(message ?? code);
    this.name = "PlanVersionError";
    this.code = code;
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type CreatePlanVersionInput = {
  planId: string;
  label: string; // trimmed 1–80 chars; throws PlanVersionError("INVALID_LABEL") if violated
  note?: string; // default ""
  snapshot: string; // already-serialised JSON string (caller's responsibility)
  serverSeqAtTag: number;
};

// List responses never include the snapshot field (payload reduction).
export type PlanVersionListItem = Omit<PlanVersionRow, "snapshot">;

// ─── CRUD ────────────────────────────────────────────────────────────────────

/**
 * Insert a new plan version row. Validates label (1–80 chars after trim).
 * Returns the full inserted row including the snapshot.
 */
export function createPlanVersion(
  input: CreatePlanVersionInput,
): PlanVersionRow {
  const label = input.label.trim();
  if (label.length < 1 || label.length > 80) {
    throw new PlanVersionError("INVALID_LABEL");
  }

  const id = `pv_${crypto.randomUUID().replace(/-/g, "")}`;

  getDb()
    .insert(planVersions)
    .values({
      id,
      planId: input.planId,
      label,
      note: input.note ?? "",
      snapshot: input.snapshot,
      serverSeqAtTag: input.serverSeqAtTag,
      // drizzle timestamp_ms mode expects a Date object; SQL default applies
      // when omitted, but we pass explicitly so the returned row is consistent.
      createdAt: new Date(),
    })
    .run();

  // SELECT the row back so callers get the full record with DB-generated defaults.
  const row = getDb()
    .select()
    .from(planVersions)
    .where(eq(planVersions.id, id))
    .get() as PlanVersionRow;

  return row;
}

/**
 * List all versions for a plan, newest first. Snapshot is excluded from the
 * result to avoid loading large payloads unnecessarily.
 */
export function listPlanVersions(planId: string): PlanVersionListItem[] {
  const rows = getDb()
    .select({
      id: planVersions.id,
      planId: planVersions.planId,
      label: planVersions.label,
      note: planVersions.note,
      serverSeqAtTag: planVersions.serverSeqAtTag,
      createdAt: planVersions.createdAt,
    })
    .from(planVersions)
    .where(eq(planVersions.planId, planId))
    .orderBy(desc(planVersions.createdAt))
    .all() as PlanVersionListItem[];

  return rows;
}

/**
 * Fetch a single version by id, including the full snapshot.
 * Returns null if not found.
 */
export function getPlanVersion(versionId: string): PlanVersionRow | null {
  const row = getDb()
    .select()
    .from(planVersions)
    .where(eq(planVersions.id, versionId))
    .get() as PlanVersionRow | undefined;

  return row ?? null;
}

/**
 * Hard-delete a version. Returns true if a row was deleted, false if not found.
 */
export function deletePlanVersion(versionId: string): boolean {
  const existing = getPlanVersion(versionId);
  if (!existing) return false;

  getDb().delete(planVersions).where(eq(planVersions.id, versionId)).run();

  return true;
}
