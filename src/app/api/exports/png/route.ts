import { NextResponse } from "next/server";
import { parseBoolParam } from "@/lib/utils";
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
  const versionIdRaw = url.searchParams.get("versionId");
  // Treat empty string as absent — only non-empty versionId triggers version export.
  const versionId =
    versionIdRaw && versionIdRaw.length > 0 ? versionIdRaw : undefined;
  const cover = parseBoolParam(url.searchParams.get("cover"), true);
  const toc = parseBoolParam(url.searchParams.get("toc"), true);
  const pageNumbers = parseBoolParam(url.searchParams.get("pageNumbers"), true);
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
  // TODO(PR-3): PNG export는 1차에서 워터마크/페이지 패딩 미반영.
  // plan.snapshot.plans / sections에서 pageSettings를 읽어
  // exportToImage에 plan/section을 전달하면 되지만,
  // exportToImage(puppeteer screenshot)은 Puppeteer margin API가 없으므로
  // watermark는 print-view.tsx의 overlay가 스크린샷에 포함돼야 함.
  // → PR-4 또는 후속 PR에서 처리.
  // Ref: src/app/api/exports/png/route.ts (이 파일 57번 줄)
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
