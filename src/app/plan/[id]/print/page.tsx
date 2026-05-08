import { notFound } from "next/navigation";
import { PrintView } from "@/components/print/print-view";
import {
  getPlan,
  isPlanLoadError,
} from "@/services/third-party-facade/plan-store";

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
  const plan = await getPlan(id);
  if (!plan) notFound();
  if (isPlanLoadError(plan)) notFound();
  return (
    <PrintView
      snapshot={plan.snapshot}
      tailEntries={plan.tailEntries}
      sectionId={sectionId}
    />
  );
}
