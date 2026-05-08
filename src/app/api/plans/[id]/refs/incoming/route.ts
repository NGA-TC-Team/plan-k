import { NextResponse } from "next/server";
import { manifestFor } from "@/builder/blocks/registry";
import type { BlockKind } from "@/builder/types/entity";
import type { AppState } from "@/builder/types/state";
import {
  getPlan,
  isPlanLoadError,
} from "@/services/third-party-facade/plan-store";
import { getIncomingRefs } from "@/services/third-party-facade/refs-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type BacklinkRow = {
  srcId: string;
  kind: "mention" | "embed" | "depends-on" | "trace";
  label: string;
  // Breadcrumb from plan root down to the src entity. Each segment is a
  // human-readable label; the UI renders them with `›` separators.
  path: string[];
};

// Returns inbound references to `?dst=<entityId>`, enriched with a
// human-readable label and breadcrumb path so the UI doesn't need a
// second round-trip to resolve src ids.
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const dst = url.searchParams.get("dst");
  if (!dst) {
    return NextResponse.json(
      { ok: false, reason: "MISSING_DST" },
      { status: 400 },
    );
  }
  const plan = await getPlan(id);
  if (!plan) {
    return NextResponse.json({ error: "Plan not found", id }, { status: 404 });
  }
  if (isPlanLoadError(plan)) {
    return NextResponse.json(plan, { status: 409 });
  }

  const rows = getIncomingRefs(id, dst);
  const enriched: BacklinkRow[] = rows.map((row) => ({
    srcId: row.srcId,
    kind: row.kind,
    label: labelFor(plan.snapshot, row.srcId),
    path: pathFor(plan.snapshot, row.srcId),
  }));

  return NextResponse.json({ planId: id, dstId: dst, refs: enriched });
}

function labelFor(snapshot: AppState, id: string): string {
  const block = snapshot.blocks?.[id];
  if (block) {
    try {
      const manifest = manifestFor(block.kind as BlockKind);
      const summary =
        typeof manifest.summary === "function"
          ? manifest.summary(block.data as never)
          : null;
      return summary || `${manifest.label}`;
    } catch {
      return `${block.kind}`;
    }
  }
  const section = snapshot.sections?.[id];
  if (section) return section.title || section.kind;
  const screen = snapshot.screens?.[id];
  if (screen) return screen.title || id;
  return id;
}

// Walks the parentId chain so the user can see "Section › Group › Block".
// Each step uses labelFor for consistency. We cap the depth at 8 to avoid
// pathological chains (none expected in practice).
function pathFor(snapshot: AppState, id: string): string[] {
  const out: string[] = [];
  let cursor: string | undefined = parentOf(snapshot, id);
  let depth = 0;
  while (cursor && depth < 8) {
    out.unshift(labelFor(snapshot, cursor));
    cursor = parentOf(snapshot, cursor);
    depth += 1;
  }
  return out;
}

function parentOf(snapshot: AppState, id: string): string | undefined {
  const block = snapshot.blocks?.[id];
  if (block?.parentId) return block.parentId;
  const section = snapshot.sections?.[id];
  if (section?.parentId) return section.parentId;
  return undefined;
}
