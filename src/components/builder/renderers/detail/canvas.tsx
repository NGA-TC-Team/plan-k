"use client";

import { LayoutGrid } from "lucide-react";
import type { BlockRenderer } from "../types";

/**
 * Center-panel preview for a canvas block.
 *
 * - If previewDataUrl is set: show the last rendered PNG.
 * - Otherwise: dashed-border placeholder with a "double-click to draw" hint.
 * - Title is shown as a caption when non-empty (mirrors FigureDetail style).
 */
export const CanvasDetail: BlockRenderer = ({ vm }) => {
  const title =
    typeof vm.displayValue.title === "string" ? vm.displayValue.title : "";
  const previewDataUrl =
    typeof vm.displayValue.previewDataUrl === "string"
      ? vm.displayValue.previewDataUrl
      : "";

  return (
    <figure className="my-2 space-y-1">
      {previewDataUrl ? (
        // biome-ignore lint/performance/noImgElement: data URL preview — no Next/Image needed.
        <img
          src={previewDataUrl}
          alt={title || "Canvas preview"}
          className="mx-auto block h-auto max-h-[min(50vh,360px)] w-auto max-w-full rounded border bg-muted/40 object-contain"
        />
      ) : (
        <div className="flex h-40 flex-col items-center justify-center gap-2 rounded border border-dashed bg-muted/20 text-muted-foreground">
          <LayoutGrid className="size-6 opacity-40" />
          <span className="text-xs">Empty canvas. Double-click to draw.</span>
        </div>
      )}
      {title ? (
        <figcaption className="text-xs text-muted-foreground">
          {title}
        </figcaption>
      ) : null}
    </figure>
  );
};
