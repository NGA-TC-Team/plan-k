import { NextResponse } from "next/server";
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
