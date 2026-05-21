"use client";

import { Eraser, Pencil, Shapes } from "lucide-react";
import type { BlockRenderer } from "../types";

// App-context canvas detail.
// Renders a static mockup with optional aspect box, placeholder text, and fake toolbar.
// Does NOT use the docs CanvasDetail (Excalidraw) — app canvas is a design placeholder.

type AspectRatio = "16:9" | "4:3" | "1:1" | "auto";

const ASPECT_CLASS: Record<AspectRatio, string> = {
  "16:9": "aspect-video",
  "4:3": "aspect-[4/3]",
  "1:1": "aspect-square",
  auto: "",
};

function stringVal(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function boolVal(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function aspectVal(v: unknown): AspectRatio {
  if (v === "16:9" || v === "4:3" || v === "1:1" || v === "auto") return v;
  return "16:9";
}

export const CanvasAppDetail: BlockRenderer = ({ vm }) => {
  const title = stringVal(vm.displayValue.title);
  const aspect = aspectVal(vm.displayValue.aspect);
  const placeholder = stringVal(vm.displayValue.placeholder) || "Canvas";
  const showToolbar = boolVal(vm.displayValue.showToolbar, true);

  return (
    <div className="flex flex-col gap-1">
      {title ? (
        <div className="text-caption font-medium text-muted-foreground">
          {title}
        </div>
      ) : null}
      <div
        className={`relative w-full overflow-hidden rounded-md border border-dashed border-muted-foreground/40 bg-muted/20 ${ASPECT_CLASS[aspect]}`}
      >
        {/* Fake toolbar */}
        {showToolbar ? (
          <div className="absolute left-0 right-0 top-0 flex items-center gap-1 border-b border-muted-foreground/20 bg-background/80 px-2 py-1.5 backdrop-blur-sm">
            <Pencil className="size-3.5 text-muted-foreground" aria-hidden />
            <Eraser className="size-3.5 text-muted-foreground" aria-hidden />
            <Shapes className="size-3.5 text-muted-foreground" aria-hidden />
          </div>
        ) : null}
        {/* Placeholder */}
        <div
          className={`absolute inset-0 flex items-center justify-center text-subhead text-muted-foreground/50 ${showToolbar ? "pt-7" : ""}`}
        >
          {placeholder}
        </div>
      </div>
    </div>
  );
};
