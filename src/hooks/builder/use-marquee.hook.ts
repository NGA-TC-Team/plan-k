"use client";

import { type RefObject, useRef, useState } from "react";
import type { Intent } from "@/builder/types/intent";

export type MarqueeBox = { x: number; y: number; w: number; h: number };

/**
 * Drag-to-select rectangle on empty canvas areas. BlockShell stops pointer
 * propagation so this hook's handlers only fire when the user begins the
 * drag on the canvas background — never on a block.
 *
 * Behavior:
 * - movement < CLICK_THRESHOLD_PX → treat as a click → clear selection
 * - movement ≥ threshold → on pointerup, hit-test every visible
 *   `[data-block-id]` element via `getBoundingClientRect` and dispatch a
 *   single SELECT_NODE / SELECT_NODES intent for the intersection.
 */
const CLICK_THRESHOLD_PX = 4;

export function useMarquee(
  rootRef: RefObject<HTMLElement | null>,
  dispatch: (intent: Intent) => void,
) {
  const startRef = useRef<{ x: number; y: number; pointerId: number } | null>(
    null,
  );
  const [box, setBox] = useState<MarqueeBox | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    // Only start when the click target is the canvas itself, not a child
    // that forgot to stopPropagation.
    if (e.target !== e.currentTarget) return;
    startRef.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
    setBox({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
    rootRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const start = startRef.current;
    if (!start) return;
    const x = Math.min(start.x, e.clientX);
    const y = Math.min(start.y, e.clientY);
    const w = Math.abs(e.clientX - start.x);
    const h = Math.abs(e.clientY - start.y);
    setBox({ x, y, w, h });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const start = startRef.current;
    if (!start) return;
    startRef.current = null;
    try {
      rootRef.current?.releasePointerCapture(start.pointerId);
    } catch {
      // ignore — capture may have been lost
    }
    const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
    setBox(null);
    if (dist < CLICK_THRESHOLD_PX) {
      dispatch({ type: "SELECT_NODE", nodeId: null });
      return;
    }
    const l = Math.min(start.x, e.clientX);
    const t = Math.min(start.y, e.clientY);
    const r = Math.max(start.x, e.clientX);
    const b = Math.max(start.y, e.clientY);
    const root = rootRef.current;
    if (!root) return;
    const ids: string[] = [];
    for (const el of root.querySelectorAll<HTMLElement>("[data-block-id]")) {
      const id = el.dataset.blockId;
      if (!id) continue;
      const rect = el.getBoundingClientRect();
      if (rect.right < l || rect.left > r || rect.bottom < t || rect.top > b) {
        continue;
      }
      ids.push(id);
    }
    if (ids.length === 0) {
      dispatch({ type: "SELECT_NODE", nodeId: null });
    } else if (ids.length === 1) {
      dispatch({ type: "SELECT_NODE", nodeId: ids[0] });
    } else {
      dispatch({ type: "SELECT_NODES", ids });
    }
  };

  return {
    box,
    handlers: { onPointerDown, onPointerMove, onPointerUp },
  };
}
