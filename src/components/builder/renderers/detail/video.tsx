"use client";

import {
  Play,
  Volume2,
  Video as VideoIcon,
} from "lucide-react";
import type { BlockRenderer } from "../types";

// Video block detail — mockup only. No real <video> element to avoid autoplay policy issues.
// Renders a styled placeholder with optional poster image, fake controls, and caption.

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

export const VideoDetail: BlockRenderer = ({ vm }) => {
  const src = stringVal(vm.displayValue.src);
  const poster = stringVal(vm.displayValue.poster);
  const caption = stringVal(vm.displayValue.caption);
  const controls = boolVal(vm.displayValue.controls, true);
  const aspect = aspectVal(vm.displayValue.aspect);

  const hasSource = src.trim().length > 0;

  return (
    <div className="flex flex-col gap-1">
      {/* Video frame */}
      <div
        className={`relative w-full overflow-hidden rounded-md bg-neutral-900 ${ASPECT_CLASS[aspect]}`}
      >
        {/* Poster image */}
        {poster.trim().length > 0 ? (
          // biome-ignore lint/performance/noImgElement: poster preview; no Next.js Image needed in mockup context
          <img
            src={poster}
            alt="Video poster"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}

        {/* Dark overlay for icon visibility */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          {hasSource ? (
            <div className="flex size-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <Play className="size-6 fill-white text-white" aria-hidden />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-white/50">
              <VideoIcon className="size-10" aria-hidden />
              <span className="text-caption">No source</span>
            </div>
          )}
        </div>

        {/* Fake controls bar */}
        {controls && hasSource ? (
          <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 bg-black/60 px-3 py-1.5 backdrop-blur-sm">
            <Play className="size-3.5 shrink-0 fill-white text-white" aria-hidden />
            {/* Progress bar */}
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div className="h-full w-1/3 rounded-full bg-white/80" />
            </div>
            <span className="shrink-0 font-mono text-[10px] text-white/70">
              0:00 / 0:00
            </span>
            <Volume2 className="size-3.5 shrink-0 text-white/70" aria-hidden />
          </div>
        ) : null}
      </div>

      {/* Caption */}
      {caption ? (
        <p className="text-caption text-muted-foreground">{caption}</p>
      ) : null}
    </div>
  );
};
