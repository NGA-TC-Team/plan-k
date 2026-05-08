import { NextResponse } from "next/server";
import {
  getPlan,
  isPlanLoadError,
} from "@/services/third-party-facade/plan-store";
import { rebuildRefs } from "@/services/third-party-facade/refs-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Recompute the refs graph for `id` from the current plan snapshot. The
// snapshot is migrated first via getPlan so a stale on-disk shape can't
// poison the rebuild.
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const plan = await getPlan(id);
  if (!plan) {
    return NextResponse.json({ error: "Plan not found", id }, { status: 404 });
  }
  if (isPlanLoadError(plan)) {
    return NextResponse.json(plan, { status: 409 });
  }
  const result = rebuildRefs(id, plan.snapshot);
  return NextResponse.json({ ok: true, planId: id, ...result });
}
