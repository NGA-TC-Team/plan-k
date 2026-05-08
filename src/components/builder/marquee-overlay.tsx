"use client";

import type { MarqueeBox } from "@/hooks/builder/use-marquee.hook";

export function MarqueeOverlay({ box }: { box: MarqueeBox | null }) {
  if (!box) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-50 rounded-sm border border-primary/60 bg-primary/10"
      style={{
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h,
      }}
    />
  );
}
