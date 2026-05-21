import { NextResponse } from "next/server";
import { z } from "zod";
import { NonNegIntSchema } from "@/lib/api-schemas";
import { parseSearchParams } from "@/lib/api-validation";
import { searchAcrossPlans } from "@/services/third-party-facade/search";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_KINDS = new Set(["project", "section", "block"]);

const SearchQuerySchema = z.object({
  q: z.string().default(""),
  planId: z.string().min(1).optional(),
  kinds: z.string().optional(),
  limit: NonNegIntSchema.optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = parseSearchParams(url, SearchQuerySchema);
  if (!parsed.ok) return parsed.response;
  const { q, planId, kinds: kindsParam, limit } = parsed.data;

  if (!q.trim()) {
    return NextResponse.json({ query: q, hits: [] });
  }

  const kinds = kindsParam
    ? kindsParam
        .split(",")
        .map((k) => k.trim())
        .filter((k) => ALLOWED_KINDS.has(k))
    : undefined;

  const hits = await searchAcrossPlans(q, {
    planId,
    kinds: kinds as ("project" | "section" | "block")[] | undefined,
    limit,
  });
  return NextResponse.json({ query: q, hits });
}
