"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import type React from "react";
import { useState } from "react";

type Props = {
  ids: string[];
  render: (id: string) => React.ReactNode;
  /** Estimated row height in px. Default: 32. */
  estimateSize?: number;
  /** Number of items to render outside the visible window. Default: 10. */
  overscan?: number;
  /**
   * The resolved scroll container element.
   *
   * Pass the DOM node directly (not a ref) so that the virtualizer receives a
   * non-null value on its first initialisation after the parent commits the
   * scroll div. Callers should store this with useState + a ref-callback:
   *
   *   const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
   *   <div ref={setScrollEl} ... />
   *   <VirtualBlockList scrollElement={scrollEl} ... />
   *
   * When scrollElement is null (pre-mount) getVirtualItems() returns [] safely
   * and the virtualizer re-initialises as soon as the state flips to non-null.
   */
  scrollElement: HTMLElement | null;
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
  scrollElement,
}: Props) {
  // Track the scroll element in state so that when it transitions null → Element
  // after mount, React re-renders this component and the virtualizer can attach
  // its ResizeObserver/ScrollObserver and return the correct getVirtualItems().
  //
  // We keep a local copy in state rather than calling getScrollElement with the
  // prop directly, because useVirtualizer reads getScrollElement once during
  // initialisation (the first render) and does not re-run it on prop changes
  // unless the component re-renders with a new value. Storing in state
  // guarantees a re-render whenever the caller's ref-callback fires.
  const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null);

  // Sync prop → state. When the parent's ref-callback fires it updates the
  // prop; this derived-state pattern keeps the virtualizer source of truth
  // inside this component. Using useState + comparing avoids extra re-renders.
  if (scrollElement !== scrollEl) {
    setScrollEl(scrollElement);
  }

  const virtualizer = useVirtualizer({
    count: ids.length,
    getScrollElement: () => scrollEl,
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
