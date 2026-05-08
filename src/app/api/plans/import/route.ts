import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { ProjectKind } from "@/builder/types/entity";
import { db, intents, intentsArchive, plans, projects } from "@/db";
import { MigrationError, migrateSnapshot } from "@/db/migrate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ImportPayload = {
  planId: string;
  kind: ProjectKind;
  snapshot: unknown;
  snapshotSeq?: number;
  intents?: IntentRow[];
  archived?: IntentRow[];
};

type IntentRow = {
  id: string;
  planId: string;
  serverSeq: number;
  lamport: number;
  origin: string;
  kind: "primary" | "inverse";
  parentEntryId: string | null;
  intent: string;
  createdAt: number | string;
};

type Options = {
  asId?: string;
  overwrite?: boolean;
};

// Counterpart to GET /api/plans/[id]/raw. Body shape matches that
// endpoint's response. ?as=<id> remaps the planId on import; ?overwrite=1
// replaces an existing row, otherwise a duplicate id 409s.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const opts: Options = {
    asId: url.searchParams.get("as") ?? undefined,
    overwrite: url.searchParams.get("overwrite") === "1",
  };

  let body: ImportPayload;
  try {
    body = (await req.json()) as ImportPayload;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "INVALID_JSON" },
      { status: 400 },
    );
  }
  if (!body || typeof body !== "object" || !body.planId || !body.kind) {
    return NextResponse.json(
      { ok: false, reason: "MISSING_FIELDS" },
      { status: 400 },
    );
  }

  // Forward-migrate the snapshot to the running schema so the imported
  // plan is immediately usable. Older snapshots that have no auto-migration
  // surface as 409 with the MigrationError payload.
  let migratedSnapshot: unknown;
  try {
    migratedSnapshot = migrateSnapshot(body.snapshot);
  } catch (err) {
    if (err instanceof MigrationError) {
      return NextResponse.json(
        {
          ok: false,
          reason: "MIGRATION_FAILED",
          fromVersion: err.fromVersion,
          toVersion: err.toVersion,
          message: err.message,
        },
        { status: 409 },
      );
    }
    throw err;
  }

  const targetId = opts.asId ?? body.planId;
  const existing = db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.id, targetId))
    .get();
  if (existing && !opts.overwrite) {
    return NextResponse.json(
      { ok: false, reason: "PLAN_EXISTS", planId: targetId },
      { status: 409 },
    );
  }

  const sourceId = body.planId;
  const remap = sourceId === targetId ? null : { from: sourceId, to: targetId };

  db.transaction((tx) => {
    if (existing) {
      // Cascade deletes the intent log + archive via FK.
      tx.delete(plans).where(eq(plans.id, targetId)).run();
      tx.delete(projects).where(eq(projects.id, targetId)).run();
    }

    tx.insert(plans)
      .values({
        id: targetId,
        kind: body.kind,
        snapshot: JSON.stringify(migratedSnapshot),
        snapshotSeq: body.snapshotSeq ?? 0,
      })
      .run();

    const project = readProjectMeta(migratedSnapshot, targetId);
    if (project) {
      tx.insert(projects)
        .values({
          id: targetId,
          kind: body.kind,
          title: project.title,
          summary: project.summary,
        })
        .run();
    }

    for (const row of body.intents ?? []) {
      tx.insert(intents)
        .values({
          id: remap ? remapId(row.id, remap) : row.id,
          planId: targetId,
          serverSeq: row.serverSeq,
          lamport: row.lamport,
          origin: row.origin,
          kind: row.kind,
          parentEntryId: row.parentEntryId
            ? remap
              ? remapId(row.parentEntryId, remap)
              : row.parentEntryId
            : null,
          intent: row.intent,
          createdAt: new Date(row.createdAt),
        })
        .run();
    }

    for (const row of body.archived ?? []) {
      tx.insert(intentsArchive)
        .values({
          id: remap ? remapId(row.id, remap) : row.id,
          planId: targetId,
          serverSeq: row.serverSeq,
          lamport: row.lamport,
          origin: row.origin,
          kind: row.kind,
          parentEntryId: row.parentEntryId
            ? remap
              ? remapId(row.parentEntryId, remap)
              : row.parentEntryId
            : null,
          intent: row.intent,
          createdAt: new Date(row.createdAt),
        })
        .run();
    }
  });

  return NextResponse.json({
    ok: true,
    planId: targetId,
    importedIntents: body.intents?.length ?? 0,
    importedArchived: body.archived?.length ?? 0,
  });
}

function readProjectMeta(
  snapshot: unknown,
  planId: string,
): { title: string; summary: string } | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const projectsField = (snapshot as { projects?: Record<string, unknown> })
    .projects;
  if (!projectsField) return null;
  const meta = (projectsField[planId] ?? Object.values(projectsField)[0]) as
    | { title?: string; summary?: string }
    | undefined;
  if (!meta) return null;
  return {
    title: typeof meta.title === "string" ? meta.title : planId,
    summary: typeof meta.summary === "string" ? meta.summary : "",
  };
}

// IntentLogEntry uses opaque string ids, so a remap is a structural
// rename — the entry contents (intent.* references) are not adjusted. In
// practice that is fine: intent payloads reference entity ids (block,
// section, ...), not entry ids, and parentEntryId is the only entry-id
// pointer that needs to follow the rename.
function remapId(id: string, remap: { from: string; to: string }): string {
  return id === remap.from ? remap.to : id;
}
