import { NextResponse } from "next/server";
import type { AppState } from "@/builder/types/state";
import {
  getPlan,
  isPlanLoadError,
} from "@/services/third-party-facade/plan-store";
import { getIncomingRefs } from "@/services/third-party-facade/refs-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type OrphansResponse = {
  planId: string;
  blocks: { id: string; kind: string; missingParent: string }[];
  sections: { id: string; kind: string; title: string }[];
};

// Reports two kinds of orphans:
//   - blocks whose parentId points at an entity no longer in the snapshot
//   - sections that aren't a docs root and aren't parent of any block
//     and have no incoming refs in the graph
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
    return NextResponse.json(plan, { status: 409 });
  }

  const { snapshot } = plan;
  const blockOrphans = findBlockOrphans(snapshot);
  const sectionOrphans = findSectionOrphans(id, snapshot);

  const body: OrphansResponse = {
    planId: id,
    blocks: blockOrphans,
    sections: sectionOrphans,
  };
  return NextResponse.json(body);
}

function findBlockOrphans(snapshot: AppState): OrphansResponse["blocks"] {
  const out: OrphansResponse["blocks"] = [];
  const blocks = snapshot.blocks ?? {};
  for (const [id, block] of Object.entries(blocks)) {
    const parentId = block.parentId;
    if (!parentId) continue;
    const exists =
      Boolean(blocks[parentId]) ||
      Boolean(snapshot.sections?.[parentId]) ||
      Boolean(snapshot.screens?.[parentId]);
    if (!exists) {
      out.push({ id, kind: block.kind, missingParent: parentId });
    }
  }
  return out;
}

function findSectionOrphans(
  planId: string,
  snapshot: AppState,
): OrphansResponse["sections"] {
  const out: OrphansResponse["sections"] = [];
  const sections = snapshot.sections ?? {};
  const docsRoots = new Set(snapshot.docsRootIds ?? []);

  // Sections that are referenced as parentId by at least one block or
  // another section are not orphans.
  const referenced = new Set<string>();
  for (const block of Object.values(snapshot.blocks ?? {})) {
    if (block.parentId) referenced.add(block.parentId);
  }
  for (const section of Object.values(sections)) {
    if (section.parentId) referenced.add(section.parentId);
  }

  for (const [id, section] of Object.entries(sections)) {
    if (docsRoots.has(id)) continue;
    if (referenced.has(id)) continue;
    // Last check: incoming refs in the graph keep a section meaningful
    // even if no block lives under it (e.g. mentioned from elsewhere).
    const incoming = getIncomingRefs(planId, id);
    if (incoming.length > 0) continue;
    out.push({ id, kind: section.kind, title: section.title });
  }
  return out;
}
