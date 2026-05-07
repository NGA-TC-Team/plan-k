import type { BlockContext, BlockKind } from "@/builder/types/entity";
import { detailRenderers } from "./detail";
import type { BlockRenderer, RendererProps } from "./types";
import { wireframeRenderers } from "./wireframe";

const UnknownBlockRenderer: BlockRenderer = ({ vm }: RendererProps) => (
  <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
    [{vm.kind}] no renderer registered
  </div>
);

export function pickRenderer(
  viewMode: "detail" | "wireframe",
  context: BlockContext,
  kind: BlockKind,
): BlockRenderer {
  const root = viewMode === "wireframe" ? wireframeRenderers : detailRenderers;
  return root[context]?.[kind] ?? UnknownBlockRenderer;
}

export type { BlockHandlers, BlockRenderer, RendererProps } from "./types";
