import { NextResponse } from "next/server";
import {
  deletePlanVersion,
  getPlanVersion,
} from "@/services/third-party-facade/plan-versions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string; vid: string }> },
) {
  const { id: planId, vid } = await ctx.params;

  const version = getPlanVersion(vid);
  if (!version) {
    return NextResponse.json(
      { error: "Version not found", versionId: vid },
      { status: 404 },
    );
  }

  // planId mismatch: return 404 to avoid information leakage (not 403)
  if (version.planId !== planId) {
    return NextResponse.json(
      { error: "Version not found", versionId: vid },
      { status: 404 },
    );
  }

  return NextResponse.json(version);
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string; vid: string }> },
) {
  const { id: planId, vid } = await ctx.params;

  const existing = getPlanVersion(vid);
  if (!existing) {
    return NextResponse.json(
      { error: "Version not found", versionId: vid },
      { status: 404 },
    );
  }

  // planId mismatch: return 404 to avoid information leakage (not 403)
  if (existing.planId !== planId) {
    return NextResponse.json(
      { error: "Version not found", versionId: vid },
      { status: 404 },
    );
  }

  const deleted = deletePlanVersion(vid);
  if (!deleted) {
    return NextResponse.json(
      { error: "Version not found", versionId: vid },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, versionId: vid });
}
