import { NextResponse } from "next/server";
import { z } from "zod";
import { BoolStringSchema } from "@/lib/api-schemas";
import { parseSearchParams } from "@/lib/api-validation";
import { exportToPdf } from "@/services/third-party-facade/exporter";
import {
  getPlan,
  isPlanLoadError,
} from "@/services/third-party-facade/plan-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ExportPdfQuerySchema = z.object({
  planId: z.string().min(1),
  sectionId: z.string().min(1).optional(),
  versionId: z.string().min(1).optional(),
  cover: BoolStringSchema,
  toc: BoolStringSchema,
  pageNumbers: BoolStringSchema,
  footerText: z.string().max(200).optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const queryParsed = parseSearchParams(url, ExportPdfQuerySchema);
  if (!queryParsed.ok) return queryParsed.response;
  const {
    planId,
    sectionId,
    versionId,
    footerText: footerTextRaw,
  } = queryParsed.data;
  // Default booleans when absent from query string
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
  const sectionMeta = sectionId ? plan.snapshot.sections[sectionId] : undefined;
  const sectionTitle = sectionMeta?.title;
  const headerTitle =
    [projectMeta?.title ?? planId, sectionTitle]
      .filter((s): s is string => Boolean(s))
      .join(" — ") || planId;
  const filename = sectionTitle ?? projectMeta?.title ?? planId;
  const pdf = await exportToPdf({
    origin: url.origin,
    planId,
    sectionId,
    headerTitle,
    cover,
    toc,
    pageNumbers,
    footerText: footerText || undefined,
    versionId,
    // pageSettings 머지를 위해 plan/section 엔티티 전달
    plan: planMeta,
    section: sectionMeta,
  });
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${slugify(filename)}.pdf"`,
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
