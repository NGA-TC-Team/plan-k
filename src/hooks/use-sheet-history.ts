"use client";

import { useEffect, useRef } from "react";

const SHEET_KEY = "plankBacklogSheet";
const FULLSCREEN_KEY = "plankBacklogFullscreen";

type HistoryState = Record<string, unknown> | null;

/**
 * Two-level synthetic history stack for the backlog sheet:
 *  - opening the sheet pushes a "sheet" entry; browser-back closes the sheet.
 *  - entering fullscreen pushes a second "fullscreen" entry; browser-back
 *    exits fullscreen (returning to the side-sheet entry). One more back
 *    then closes the sheet.
 *
 * Programmatic toggles (close button / shrink button) call history.back() to
 * pop their own entry; a skip ref suppresses the resulting popstate so it
 * doesn't double-fire onClose / onExitFullscreen.
 */
export function useSheetHistory(
  open: boolean,
  isFullscreen: boolean,
  onClose: () => void,
  onExitFullscreen: () => void,
): void {
  const isFullscreenRef = useRef(isFullscreen);
  const skipNextPopRef = useRef(false);

  useEffect(() => {
    isFullscreenRef.current = isFullscreen;
  }, [isFullscreen]);

  // Base entry: pushed when the sheet opens, popped when it closes.
  useEffect(() => {
    if (!open) return;

    window.history.pushState({ [SHEET_KEY]: true }, "");

    const onPop = () => {
      if (skipNextPopRef.current) {
        skipNextPopRef.current = false;
        return;
      }
      if (isFullscreenRef.current) {
        onExitFullscreen();
        return;
      }
      onClose();
    };

    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("popstate", onPop);
      const state = window.history.state as HistoryState;
      if (state?.[SHEET_KEY]) {
        skipNextPopRef.current = true;
        window.history.back();
      }
    };
  }, [open, onClose, onExitFullscreen]);

  // Extra entry while fullscreen is active.
  useEffect(() => {
    if (!open || !isFullscreen) return;

    window.history.pushState({ [FULLSCREEN_KEY]: true }, "");

    return () => {
      const state = window.history.state as HistoryState;
      if (state?.[FULLSCREEN_KEY]) {
        skipNextPopRef.current = true;
        window.history.back();
      }
    };
  }, [open, isFullscreen]);
}
