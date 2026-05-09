import { notFound } from "next/navigation";
import type { AppState } from "@/builder/types/state";
import { PrintView } from "@/components/print/print-view";
import { parseBoolParam } from "@/lib/utils";
import {
  getPlan,
  isPlanLoadError,
} from "@/services/third-party-facade/plan-store";
import { getPlanVersion } from "@/services/third-party-facade/plan-versions";

export const dynamic = "force-dynamic";

export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const sectionParam = sp.sectionId;
  const sectionId = Array.isArray(sectionParam)
    ? sectionParam[0]
    : sectionParam;

  // versionId: non-empty string only triggers version-scoped export.
  const versionIdRaw = Array.isArray(sp.versionId)
    ? sp.versionId[0]
    : sp.versionId;
  const versionId =
    versionIdRaw && versionIdRaw.length > 0 ? versionIdRaw : undefined;

  const toc = parseBoolParam(sp.toc, true);

  if (versionId) {
    // ── Version-scoped export path ─────────────────────────────────────────
    // Cover is forced true per design spec D7 ("버전 export: 자동 — 표지에 버전 라벨").
    const cover = true;

    const row = getPlanVersion(versionId);
    if (!row) notFound();

    let snapshot: AppState;
    try {
      snapshot = JSON.parse(row.snapshot) as AppState;
    } catch (err) {
      console.error(
        "[PrintPage] Failed to parse version snapshot:",
        versionId,
        err,
      );
      notFound();
    }

    // Truncate note longer than 400 chars on the server side so PrintView
    // receives a display-ready string.
    const noteRaw = row.note ?? "";
    const versionNote =
      noteRaw.length > 400 ? `${noteRaw.slice(0, 400)}…` : noteRaw;

    return (
      <PrintView
        snapshot={snapshot}
        tailEntries={[]}
        sectionId={sectionId}
        cover={cover}
        toc={toc}
        versionLabel={row.label}
        versionNote={versionNote || undefined}
        versionTaggedAt={row.createdAt}
      />
    );
  }

  // ── Current-plan export path (existing behaviour) ──────────────────────
  const cover = parseBoolParam(sp.cover, true);

  const plan = await getPlan(id);
  if (!plan) notFound();
  if (isPlanLoadError(plan)) notFound();

  return (
    <PrintView
      snapshot={plan.snapshot}
      tailEntries={plan.tailEntries}
      sectionId={sectionId}
      cover={cover}
      toc={toc}
    />
  );
}
