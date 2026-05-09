import { notFound } from "next/navigation";
import { PrintView } from "@/components/print/print-view";
import {
  getPlan,
  isPlanLoadError,
} from "@/services/third-party-facade/plan-store";

export const dynamic = "force-dynamic";

// Boolean searchParam: any value other than "false" is treated as true.
function spBool(
  sp: Record<string, string | string[] | undefined>,
  key: string,
  defaultVal: boolean,
): boolean {
  const raw = sp[key];
  if (raw === undefined) return defaultVal;
  const val = Array.isArray(raw) ? raw[0] : raw;
  return val !== "false";
}

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
  const cover = spBool(sp, "cover", true);
  const toc = spBool(sp, "toc", true);
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
