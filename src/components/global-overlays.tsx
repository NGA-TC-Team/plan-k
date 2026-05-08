"use client";

import { CommandPalette } from "@/components/command-palette/palette";
import { KeymapSheet } from "@/components/help/keymap-sheet";
import { useGlobalShortcuts } from "@/hooks/use-global-shortcuts.hook";

// Mounted once at the layout/providers level so `?` and ⌘K work on every
// route, not only inside the builder.
export function GlobalOverlays() {
  useGlobalShortcuts();
  return (
    <>
      <KeymapSheet />
      <CommandPalette />
    </>
  );
}
