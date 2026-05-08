import { NextResponse } from "next/server";
import { db, plans } from "@/db";
import { rebuildSearch } from "@/db/search-index";
import {
  getPlan,
  isPlanLoadError,
} from "@/services/third-party-facade/plan-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Rebuild the FTS5 index for every plan in one pass. Plans whose
// snapshot can't be migrated to the running schema are skipped (still
// recoverable via the per-plan recovery dialog) and reported back so
// the caller sees what didn't get reindexed.
export async function POST() {
  const planIds = db.select({ id: plans.id }).from(plans).all();
  const successes: { planId: string; rows: number }[] = [];
  const failures: { planId: string; reason: string }[] = [];

  for (const { id } of planIds) {
    const plan = await getPlan(id);
    if (!plan) {
      failures.push({ planId: id, reason: "PLAN_NOT_FOUND" });
      continue;
    }
    if (isPlanLoadError(plan)) {
      failures.push({ planId: id, reason: plan.error });
      continue;
    }
    const result = rebuildSearch(id, plan.snapshot);
    successes.push({ planId: id, rows: result.rows });
  }

  return NextResponse.json({ ok: true, successes, failures });
}
