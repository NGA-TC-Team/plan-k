import { NextResponse } from "next/server";
import { z } from "zod";
import { BoolStringSchema, NonNegIntSchema } from "@/lib/api-schemas";
import { parseSearchParams } from "@/lib/api-validation";
import { exportToImage } from "@/services/third-party-facade/exporter";
import {
  getPlan,
  isPlanLoadError,
} from "@/services/third-party-facade/plan-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ExportPngQuerySchema = z.object({
  planId: z.string().min(1),
  sectionId: z.string().min(1).optional(),
  versionId: z.string().min(1).optional(),
  width: NonNegIntSchema.optional(),
  cover: BoolStringSchema,
  toc: BoolStringSchema,
  pageNumbers: BoolStringSchema,
  footerText: z.string().max(200).optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const queryParsed = parseSearchParams(url, ExportPngQuerySchema);
  if (!queryParsed.ok) return queryParsed.response;
  const {
    planId,
    sectionId,
    versionId,
    footerText: footerTextRaw,
  } = queryParsed.data;
  const viewportWidth = queryParsed.data.width;
  const cover = queryParsed.data.cover ?? true;
  const toc = queryParsed.data.toc ?? true;
  const pageNumbers = queryParsed.data.pageNumbers ?? true;
  const footerText = footerTextRaw ?? "";

  const plan = await getPlan(planId);
  if (!plan) {
    return NextResponse.json(
      { ok: false, reason: "PLAN_NOT_FOUND" },
      { status: 404 },
    );
  }
  if (isPlanLoadError(plan)) {
    return NextResponse.json(
      { ok: false, reason: plan.error, detail: plan },
      { status: 409 },
    );
  }
  const planMeta = Object.values(plan.snapshot.plans)[0];
  const projectMeta = planMeta
    ? plan.snapshot.projects[planMeta.projectId]
    : undefined;
  const sectionTitle = sectionId
    ? plan.snapshot.sections[sectionId]?.title
    : undefined;
  const sectionMeta = sectionId ? plan.snapshot.sections[sectionId] : undefined;
  const filename = sectionTitle ?? projectMeta?.title ?? planId;
  const png = await exportToImage({
    origin: url.origin,
    planId,
    sectionId,
    viewportWidth: Number.isFinite(viewportWidth) ? viewportWidth : undefined,
    cover,
    toc,
    pageNumbers,
    footerText: footerText || undefined,
    versionId,
    // plan/section 메타 전달 → exporter가 paddingMm 계산 + tiled 워터마크 적용.
    plan: planMeta ?? undefined,
    section: sectionMeta ?? undefined,
  });
  return new NextResponse(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${slugify(filename)}.png"`,
      "Cache-Control": "no-store",
    },
  });
}

function slugify(input: string): string {
  return (
    input
      .trim()
      .replace(/[^a-zA-Z0-9가-힣\s-]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase() || "plan"
  );
}
