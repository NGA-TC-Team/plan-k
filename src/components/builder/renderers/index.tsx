import type { BlockKind } from "@/builder/types/entity";
import { detailRenderers } from "./detail";
import type { BlockRenderer, RendererProps } from "./types";
import { wireframeRenderers } from "./wireframe";

const FallbackRenderer: BlockRenderer = ({ vm }: RendererProps) => (
  <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
    [{vm.kind}] no renderer registered
  </div>
);

export function pickRenderer(
  viewMode: "detail" | "wireframe",
  kind: BlockKind,
): BlockRenderer {
  const registry =
    viewMode === "wireframe" ? wireframeRenderers : detailRenderers;
  return registry[kind] ?? FallbackRenderer;
}

export type { BlockHandlers, BlockRenderer, RendererProps } from "./types";
