import { BuilderPage } from "@/components/builder/builder-page";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BuilderPage planId={id} />;
}
