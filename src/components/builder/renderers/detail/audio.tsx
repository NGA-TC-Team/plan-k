"use client";

import { Headphones, Play, Volume2 } from "lucide-react";
import type { BlockRenderer } from "../types";

// Audio block detail — mockup only. No real <audio> element.
// Renders a horizontal player-style bar with title, fake progress, and volume icon.

function stringVal(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function boolVal(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

export const AudioDetail: BlockRenderer = ({ vm }) => {
  const src = stringVal(vm.displayValue.src);
  const title = stringVal(vm.displayValue.title);
  const controls = boolVal(vm.displayValue.controls, true);

  const hasSource = src.trim().length > 0;

  return (
    <div
      className={`flex items-center gap-3 rounded-md border border-hairline bg-surface-1 px-3 py-2 ${!hasSource ? "opacity-50" : ""}`}
      aria-label={title || "Audio player"}
    >
      {/* Play icon */}
      {controls ? (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Play
            className="size-4 fill-primary text-primary"
            aria-hidden
          />
        </div>
      ) : (
        <Headphones className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      )}

      {/* Title + progress */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title ? (
          <span className="truncate text-body-sm font-medium">{title}</span>
        ) : (
          <span className="truncate text-caption italic text-muted-foreground/60">
            {hasSource ? src : "No source"}
          </span>
        )}
        {/* Fake progress bar */}
        {controls ? (
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full w-0 rounded-full bg-primary/60" />
          </div>
        ) : null}
      </div>

      {/* Volume icon */}
      {controls ? (
        <Volume2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      ) : null}
    </div>
  );
};
