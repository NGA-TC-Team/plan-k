import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, intents, intentsArchive, plans } from "@/db";

export const dynamic = "force-dynamic";

// Migration-bypassing dump for export-then-reset recovery. Returns the
// snapshot JSON verbatim plus the active and archived intent logs so the
// user can keep a copy of in-progress data before resetting.
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const plan = db.select().from(plans).where(eq(plans.id, id)).get();
  if (!plan) {
    return NextResponse.json({ error: "Plan not found", id }, { status: 404 });
  }
  const active = db
    .select()
    .from(intents)
    .where(eq(intents.planId, id))
    .orderBy(asc(intents.serverSeq))
    .all();
  const archived = db
    .select()
    .from(intentsArchive)
    .where(eq(intentsArchive.planId, id))
    .orderBy(asc(intentsArchive.serverSeq))
    .all();
  return NextResponse.json({
    planId: id,
    kind: plan.kind,
    snapshot: JSON.parse(plan.snapshot),
    snapshotSeq: plan.snapshotSeq,
    intents: active,
    archived,
    exportedAt: new Date().toISOString(),
  });
}
