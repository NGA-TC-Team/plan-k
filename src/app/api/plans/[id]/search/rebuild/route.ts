import { NextResponse } from "next/server";
import { rebuildSearch } from "@/db/search-index";
import {
  getPlan,
  isPlanLoadError,
} from "@/services/third-party-facade/plan-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Recompute the FTS5 index for `id`. Loads the migrated snapshot via
// getPlan so a stale on-disk shape can't poison the rebuild.
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
  const result = rebuildSearch(id, plan.snapshot);
  return NextResponse.json({ ok: true, planId: id, ...result });
}
