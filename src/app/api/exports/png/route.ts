import { NextResponse } from "next/server";
import { exportToImage } from "@/services/third-party-facade/exporter";
import {
  getPlan,
  isPlanLoadError,
} from "@/services/third-party-facade/plan-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const planId = url.searchParams.get("planId");
  if (!planId) {
    return NextResponse.json(
      { ok: false, reason: "MISSING_PLAN_ID" },
      { status: 400 },
    );
  }
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
  const widthParam = url.searchParams.get("width");
  const viewportWidth = widthParam
    ? Number.parseInt(widthParam, 10)
    : undefined;
  const sectionId = url.searchParams.get("sectionId") ?? undefined;
  // Boolean param: any value other than "false" is treated as true (forgiving).
  const parseBool = (param: string | null, defaultVal: boolean): boolean => {
    if (param === null) return defaultVal;
    return param !== "false";
  };
  const cover = parseBool(url.searchParams.get("cover"), true);
  const toc = parseBool(url.searchParams.get("toc"), true);
  const pageNumbers = parseBool(url.searchParams.get("pageNumbers"), true);
  const footerTextRaw = url.searchParams.get("footerText") ?? "";
  // Clamp footerText to 200 chars to avoid oversized templates.
  const footerText = footerTextRaw.slice(0, 200);
  const planMeta = Object.values(plan.snapshot.plans)[0];
  const projectMeta = planMeta
    ? plan.snapshot.projects[planMeta.projectId]
    : undefined;
  const sectionTitle = sectionId
    ? plan.snapshot.sections[sectionId]?.title
    : undefined;
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
