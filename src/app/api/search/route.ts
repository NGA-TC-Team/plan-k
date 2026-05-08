import { NextResponse } from "next/server";
import { searchAcrossPlans } from "@/services/third-party-facade/search";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_KINDS = new Set(["project", "section", "block"]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  if (!q.trim()) {
    return NextResponse.json({ query: q, hits: [] });
  }

  const planId = url.searchParams.get("planId") ?? undefined;
  const kindsParam = url.searchParams.get("kinds");
  const kinds = kindsParam
    ? kindsParam
        .split(",")
        .map((k) => k.trim())
        .filter((k) => ALLOWED_KINDS.has(k))
    : undefined;

  const limitRaw = url.searchParams.get("limit");
  const limitParsed = limitRaw ? Number.parseInt(limitRaw, 10) : Number.NaN;

  const hits = await searchAcrossPlans(q, {
    planId,
    kinds: kinds as ("project" | "section" | "block")[] | undefined,
    limit: Number.isFinite(limitParsed) ? limitParsed : undefined,
  });
  return NextResponse.json({ query: q, hits });
}
