import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, plans, projects } from "@/db";
import {
  getPlan,
  isPlanLoadError,
} from "@/services/third-party-facade/plan-store";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const plan = await getPlan(id);
  if (!plan) {
    return NextResponse.json({ error: "Plan not found", id }, { status: 404 });
  }
  if (isPlanLoadError(plan)) {
    // 409 — the plan exists but its snapshot version cannot be migrated to
    // the running schema. Client should offer export-then-reset.
    return NextResponse.json(plan, { status: 409 });
  }
  return NextResponse.json(plan);
}

// Reset path used by the export-then-reset recovery flow. Removes the plan
// row (intents cascade-delete via FK) and the matching project row so the
// next GET reseeds from SEED_KINDS or returns 404. The user is expected to
// have already pulled a JSON dump via /raw before calling this.
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const exists = db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.id, id))
    .get();
  if (!exists) {
    return NextResponse.json({ error: "Plan not found", id }, { status: 404 });
  }
  db.transaction((tx) => {
    tx.delete(plans).where(eq(plans.id, id)).run();
    tx.delete(projects).where(eq(projects.id, id)).run();
  });
  return NextResponse.json({ ok: true, id });
}
