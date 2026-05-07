import { NextResponse } from "next/server";
import { searchAcrossPlans } from "@/services/third-party-facade/search";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json({ query: q, hits: [] });
  }
  const hits = await searchAcrossPlans(q);
  return NextResponse.json({ query: q, hits });
}
