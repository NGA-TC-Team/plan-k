import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { hydrate } from "@/builder/hydrate";
import { db, intents, plans } from "@/db";
import {
  getPlan,
  isPlanLoadError,
} from "@/services/third-party-facade/plan-store";
import {
  createPlanVersion,
  listPlanVersions,
  PlanVersionError,
} from "@/services/third-party-facade/plan-versions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: planId } = await ctx.params;

  const planRow = db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.id, planId))
    .get();
  if (!planRow) {
    return NextResponse.json(
      { error: "Plan not found", planId },
      { status: 404 },
    );
  }

  const rows = listPlanVersions(planId);
  return NextResponse.json(rows);
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: planId } = await ctx.params;

  // Parse body — 400 if not valid JSON
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, reason: "INVALID_JSON" },
      { status: 400 },
    );
  }

  // Type validation
  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>).label !== "string"
  ) {
    return NextResponse.json(
      { ok: false, reason: "INVALID_LABEL" },
      { status: 400 },
    );
  }

  const { label, note } = body as { label: string; note?: unknown };
  if (note !== undefined && typeof note !== "string") {
    return NextResponse.json(
      { ok: false, reason: "INVALID_LABEL" },
      { status: 400 },
    );
  }

  // Load plan — 404 or 409 on error
  const planResult = await getPlan(planId);
  if (!planResult) {
    return NextResponse.json(
      { error: "Plan not found", planId },
      { status: 404 },
    );
  }
  if (isPlanLoadError(planResult)) {
    return NextResponse.json(planResult, { status: 409 });
  }

  // Build full hydrated AppState and serialise
  const { snapshot, tailEntries } = planResult;
  const hydratedState = hydrate(snapshot, tailEntries);
  const snapshotJson = JSON.stringify(hydratedState);

  // Determine serverSeqAtTag: MAX(intents.serverSeq) for this plan,
  // falling back to plans.snapshotSeq, then 0.
  const planRow = db
    .select({ snapshotSeq: plans.snapshotSeq })
    .from(plans)
    .where(eq(plans.id, planId))
    .get();

  const maxSeqRow = db
    .select({
      maxSeq: sql<number>`COALESCE(MAX(${intents.serverSeq}), 0)`,
    })
    .from(intents)
    .where(eq(intents.planId, planId))
    .get();

  const serverSeqAtTag =
    (maxSeqRow?.maxSeq ?? 0) || (planRow?.snapshotSeq ?? 0);

  // Create version — 400 on label validation failure
  try {
    const version = createPlanVersion({
      planId,
      label,
      note: typeof note === "string" ? note : "",
      snapshot: snapshotJson,
      serverSeqAtTag,
    });
    return NextResponse.json(version, { status: 201 });
  } catch (err) {
    if (err instanceof PlanVersionError && err.code === "INVALID_LABEL") {
      return NextResponse.json(
        { ok: false, reason: "INVALID_LABEL" },
        { status: 400 },
      );
    }
    throw err;
  }
}
