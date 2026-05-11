"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import type React from "react";

type Props = {
  ids: string[];
  render: (id: string) => React.ReactNode;
  /** Estimated row height in px. Default: 32. */
  estimateSize?: number;
  /** Number of items to render outside the visible window. Default: 10. */
  overscan?: number;
  /** Ref pointing at the scrollable container that wraps this list. */
  scrollContainerRef: React.RefObject<HTMLElement | null>;
};

/**
 * VirtualBlockList
 *
 * Renders only the visible subset of `ids` using @tanstack/react-virtual.
 * Mirrors the chat-message-list.tsx pattern (absolute-positioned rows inside
 * a sized outer container) so the scroll parent can be any overflow-y-auto
 * element.
 *
 * Non-goals: enter/exit animations, DnD, infinite scroll.
 */
export function VirtualBlockList({
  ids,
  render,
  estimateSize = 32,
  overscan = 10,
  scrollContainerRef,
}: Props) {
  const virtualizer = useVirtualizer({
    count: ids.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => estimateSize,
    overscan,
    // Dynamic measurement: each row self-reports its rendered height so the
    // virtualizer can recalculate total size and scroll offsets accurately.
    measureElement: (el) => el.getBoundingClientRect().height,
  });

  if (ids.length === 0) return null;

  return (
    // Sized outer container — height matches the sum of all virtual rows.
    <div
      style={{ height: `${virtualizer.getTotalSize()}px`, width: "100%" }}
      className="relative"
    >
      {virtualizer.getVirtualItems().map((vi) => {
        const id = ids[vi.index];
        return (
          <div
            key={vi.key}
            data-index={vi.index}
            // measureElement ref callback: lets the virtualizer read the true
            // rendered height of each row after paint.
            ref={virtualizer.measureElement}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${vi.start}px)`,
            }}
          >
            {render(id)}
          </div>
        );
      })}
    </div>
  );
}
