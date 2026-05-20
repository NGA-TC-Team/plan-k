"use client";

// Excalidraw evaluates `window` at module load, so the package cannot be
// imported on the server. We dynamic-import the React component (ssr:false)
// and lazy-import the standalone utilities (exportToBlob,
// viewportCoordsToSceneCoords) inside the handlers that use them.
import { useVirtualizer } from "@tanstack/react-virtual";
import "@excalidraw/excalidraw/index.css";
import type { FileId } from "@excalidraw/excalidraw/element/types";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";
import { Boxes } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useDeferredValue, useRef, useState } from "react";

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((m) => m.Excalidraw),
  { ssr: false },
);

import {
  CANVAS_ICONS_BY_CATEGORY,
  type CanvasIconCategory,
} from "@/builder/canvas/icons-manifest";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useBuilderDispatch } from "@/hooks/builder/use-builder-store.hook";
import type { BlockRenderer } from "../types";

// ─── helpers ──────────────────────────────────────────────────────────────────

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("FileReader did not return a string"));
      }
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("FileReader error"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Fetches a remote resource (typically an SVG icon) and converts it to a
 * data: URL string. Throws on non-2xx status or blob conversion failure.
 */
async function fetchSvgAsDataURL(src: string): Promise<string> {
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(
      `[canvas-editor] icon fetch failed ${response.status}: ${src}`,
    );
  }
  const blob = await response.blob();
  return blobToDataUrl(blob);
}

const CATEGORIES: CanvasIconCategory[] = [
  "group",
  "service",
  "category",
  "resource",
];

// ─── Icon picker sidebar ───────────────────────────────────────────────────────

function IconPickerSidebar({
  onDragStart,
}: {
  onDragStart: (src: string) => void;
}) {
  const [activeCategory, setActiveCategory] =
    useState<CanvasIconCategory>("service");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const icons = CANVAS_ICONS_BY_CATEGORY[activeCategory] ?? [];
  const filtered =
    deferredQuery.trim().length > 0
      ? icons.filter((ic) =>
          ic.name.toLowerCase().includes(deferredQuery.trim().toLowerCase()),
        )
      : icons;

  // Virtualizer: row height 36px, icon + name side-by-side.
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 8,
  });

  return (
    <aside
      className="flex w-[280px] shrink-0 flex-col border-r bg-background"
      aria-label="Icon picker"
    >
      {/* Category tabs */}
      <div className="flex shrink-0 gap-0.5 border-b p-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => {
              setActiveCategory(cat);
              setQuery("");
            }}
            className={`flex-1 rounded px-1 py-0.5 text-caption capitalize transition-colors ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="shrink-0 border-b p-1.5">
        <Input
          placeholder="Search icons…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-6 text-xs"
        />
      </div>

      {/* Virtualized icon list */}
      <div ref={parentRef} className="flex-1 overflow-y-auto">
        <div
          style={{ height: rowVirtualizer.getTotalSize() }}
          className="relative"
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const icon = filtered[virtualRow.index];
            if (!icon) return null;
            return (
              // biome-ignore lint/a11y/noStaticElementInteractions: HTML5 drag source for canvas; keyboard equivalent not meaningful
              <div
                key={icon.id}
                style={{
                  position: "absolute",
                  top: virtualRow.start,
                  left: 0,
                  width: "100%",
                  height: virtualRow.size,
                }}
                className="flex cursor-grab items-center gap-2 px-2 py-1 hover:bg-muted/60 active:cursor-grabbing"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/x-canvas-icon", icon.src);
                  e.dataTransfer.setData("text/plain", icon.name);
                  e.dataTransfer.effectAllowed = "copy";
                  onDragStart(icon.src);
                }}
                title={icon.name}
              >
                {/* biome-ignore lint/performance/noImgElement: icon thumbnail, sizes are tiny */}
                <img
                  src={icon.src}
                  alt={icon.name}
                  width={24}
                  height={24}
                  className="shrink-0 object-contain"
                  onError={(e) => {
                    // Hide broken thumbnails rather than showing a broken-image icon.
                    console.warn(
                      `[canvas-editor] Failed to load icon: ${icon.src}`,
                    );
                    (e.currentTarget as HTMLImageElement).style.display =
                      "none";
                  }}
                />
                <span className="truncate text-caption text-muted-foreground">
                  {icon.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

// ─── Drop zone wrapper ─────────────────────────────────────────────────────────

function ExcalidrawDropZone({
  apiRef,
  children,
}: {
  apiRef: React.RefObject<ExcalidrawImperativeAPI | null>;
  children: React.ReactNode;
}) {
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    const hasIcon = e.dataTransfer.types.includes("application/x-canvas-icon");
    if (hasIcon) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      const iconSrc = e.dataTransfer.getData("application/x-canvas-icon");

      // Boundary: ignore invalid or empty transfer payload.
      if (typeof iconSrc !== "string" || iconSrc.trim() === "") return;

      const api = apiRef.current;
      if (!api) return;

      // Guard against NaN/Infinity coords (edge case with rapid drops).
      const clientX = e.clientX;
      const clientY = e.clientY;
      if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return;

      // Convert viewport coords to Excalidraw scene coords.
      // viewportCoordsToSceneCoords is a standalone util, not an API method.
      // Lazy-imported because Excalidraw's package touches `window` at load time.
      const appState = api.getAppState();
      const { viewportCoordsToSceneCoords } = await import(
        "@excalidraw/excalidraw"
      );
      const { x, y } = viewportCoordsToSceneCoords(
        { clientX, clientY },
        appState,
      );
      const W = 64;
      const H = 64;

      // Fetch SVG → dataURL before inserting; skip on any network/blob failure.
      let dataURL: string;
      try {
        dataURL = await fetchSvgAsDataURL(iconSrc);
      } catch (err) {
        console.warn("[canvas-editor] Icon fetch failed, skipping drop:", err);
        return;
      }

      try {
        const fileId = crypto.randomUUID() as FileId;

        // Register file data in Excalidraw's file cache.
        // DataURL is a branded string type in Excalidraw; cast is safe because
        // fetchSvgAsDataURL always calls FileReader.readAsDataURL which produces
        // a valid data: URI.
        api.addFiles([
          {
            id: fileId,
            mimeType: "image/svg+xml",
            // biome-ignore lint/suspicious/noExplicitAny: DataURL is an opaque branded type; the value is produced by FileReader.readAsDataURL and is always a valid data: URI
            dataURL: dataURL as any,
            created: Date.now(),
            lastRetrieved: Date.now(),
          },
        ]);

        // Build a fully-qualified image element.
        // convertToExcalidrawElements does not support the "image" type,
        // so required fields (versionNonce, seed, updated, etc.) are hand-filled.
        const imageElement = {
          type: "image" as const,
          id: crypto.randomUUID(),
          x: x - W / 2,
          y: y - H / 2,
          width: W,
          height: H,
          fileId,
          status: "saved" as const,
          angle: 0,
          strokeColor: "transparent",
          backgroundColor: "transparent",
          fillStyle: "solid" as const,
          strokeWidth: 1,
          strokeStyle: "solid" as const,
          roughness: 0,
          opacity: 100,
          seed: Math.floor(Math.random() * 100000),
          version: 1,
          versionNonce: Math.floor(Math.random() * 100000),
          isDeleted: false,
          groupIds: [] as string[],
          boundElements: null,
          locked: false,
          link: null,
          updated: Date.now(),
          frameId: null,
          scale: [1, 1] as [number, number],
        };

        api.updateScene({
          elements: [
            ...api.getSceneElementsIncludingDeleted(),
            // biome-ignore lint/suspicious/noExplicitAny: Excalidraw image element type requires manual field completion; cast needed due to internal required fields
            imageElement as any,
          ],
        });
      } catch (err) {
        // Non-fatal: shape insertion failed; user can retry.
        console.error("[canvas-editor] Failed to insert icon shape:", err);
      }
    },
    [apiRef],
  );

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drop target for canvas; non-interactive otherwise
    <div
      className="relative flex-1"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
    </div>
  );
}

// ─── Snapshot shape ───────────────────────────────────────────────────────────

interface ExcalidrawSnapshot {
  elements: readonly unknown[];
  appState: Partial<AppState>;
  files: BinaryFiles;
}

function isExcalidrawSnapshot(v: unknown): v is ExcalidrawSnapshot {
  return (
    typeof v === "object" &&
    v !== null &&
    "elements" in v &&
    Array.isArray((v as ExcalidrawSnapshot).elements)
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────

export const CanvasEditor: BlockRenderer = ({ vm, handlers }) => {
  const dispatch = useBuilderDispatch();

  // Local mutable state — only committed on Apply.
  const [title, setTitle] = useState(
    typeof vm.displayValue.title === "string" ? vm.displayValue.title : "",
  );
  const [showIcons, setShowIcons] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // Excalidraw imperative API ref — populated via excalidrawAPI callback prop.
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);

  // Stable snapshot from block data — read once on mount.
  const initialSnapshot = vm.displayValue.snapshot ?? null;

  // Build initialData from stored snapshot. Falls back to empty scene if the
  // snapshot is from a previous tldraw block (incompatible shape).
  const initialData = (() => {
    if (!initialSnapshot) {
      return {
        elements: [],
        appState: { objectsSnapModeEnabled: true },
        files: {},
      };
    }
    if (isExcalidrawSnapshot(initialSnapshot)) {
      return {
        elements: initialSnapshot.elements,
        appState: {
          ...initialSnapshot.appState,
          // Always start with snap guides ON, regardless of saved state.
          objectsSnapModeEnabled: true,
        },
        files: initialSnapshot.files ?? {},
      };
    }
    // Incompatible (old tldraw) snapshot — start fresh, preserve title.
    console.warn(
      "[canvas-editor] Snapshot is not an Excalidraw snapshot, starting with empty canvas.",
    );
    return {
      elements: [],
      appState: { objectsSnapModeEnabled: true },
      files: {},
    };
  })();

  // Capture the Excalidraw imperative API and restore the stored snapshot.
  // Using the excalidrawAPI prop callback (fires once, synchronously after mount).
  const handleExcalidrawAPI = useCallback((api: ExcalidrawImperativeAPI) => {
    if (!api) return; // Guard: race between callback fire and component teardown.
    apiRef.current = api;
  }, []);

  const handleApply = useCallback(async () => {
    // Guard against double-submit while preview render is in flight.
    if (isApplying) return;
    setIsApplying(true);

    const api = apiRef.current;
    let previewDataUrl = "";
    let snapshot: ExcalidrawSnapshot | null = null;

    if (api) {
      // Serialize canvas state.
      try {
        const elements = api.getSceneElementsIncludingDeleted();
        const appState = api.getAppState();
        const files = api.getFiles();
        snapshot = { elements, appState, files };
      } catch (err) {
        console.error("[canvas-editor] Failed to serialize snapshot:", err);
        // snapshot remains null — still proceed to commit what we have.
      }

      // Generate PNG preview — failure is non-fatal; still save snapshot.
      try {
        const elements = api.getSceneElements();
        if (elements.length > 0) {
          const appState = api.getAppState();
          const files = api.getFiles();
          const { exportToBlob } = await import("@excalidraw/excalidraw");
          const blob = await exportToBlob({
            elements,
            appState: {
              ...appState,
              exportBackground: true,
              // Ensure white background for PNG readability on dark themes.
              viewBackgroundColor: "#ffffff",
              // 2x device-pixel density so the preview stays sharp when
              // the detail renderer scales the image down to fit the block.
              exportScale: 2,
            },
            files,
            mimeType: "image/png",
          });
          previewDataUrl = await blobToDataUrl(blob);
        }
      } catch (err) {
        console.warn(
          "[canvas-editor] Preview render failed, saving without preview:",
          err,
        );
        previewDataUrl = "";
      }
    }

    // Commit through the standard CHANGE_DRAFT → COMMIT_EDIT flow.
    dispatch({
      type: "CHANGE_DRAFT",
      value: { title, snapshot, previewDataUrl },
    });
    handlers.onCommitEdit();

    // Reset guard — component will unmount shortly after onCommitEdit but
    // guard is still needed for edge-cases where unmount is async.
    setIsApplying(false);
  }, [isApplying, title, dispatch, handlers]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) handlers.onCancelEdit();
    },
    [handlers],
  );

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        // Issue 1 fix: stop React propagation so the builder's global keydown
        // listener (decide-shortcut.ts:40-44) never sees keys typed inside the
        // modal. Escape is handled by base-ui via native listeners → still works.
        onKeyDown={(e) => e.stopPropagation()}
        // Keep default top-1/2 / left-1/2 + -translate centering from DialogContent.
        // Only override size/layout to fill most of the viewport with margin.
        className="flex h-[min(1100px,calc(100vh-4rem))] w-[min(1600px,calc(100vw-4rem))] max-w-none flex-col gap-0 overflow-hidden rounded-xl border bg-background p-0 shadow-2xl sm:max-w-none"
      >
        {/* Header toolbar */}
        <header className="flex shrink-0 items-center gap-2 border-b px-3 py-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Canvas title"
            className="h-7 max-w-xs text-sm"
            aria-label="Canvas title"
          />
          <Button
            type="button"
            size="sm"
            variant={showIcons ? "default" : "outline"}
            onClick={() => setShowIcons((v) => !v)}
            aria-pressed={showIcons}
          >
            <Boxes className="mr-1 size-3.5" />
            Objects
          </Button>
          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handlers.onCancelEdit}
              disabled={isApplying}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              disabled={isApplying}
            >
              {isApplying ? "Saving…" : "Apply"}
            </Button>
          </div>
        </header>

        {/* Body: optional icon sidebar + Excalidraw canvas */}
        <div className="flex min-h-0 flex-1">
          {showIcons ? <IconPickerSidebar onDragStart={() => {}} /> : null}
          <ExcalidrawDropZone apiRef={apiRef}>
            {/* Excalidraw fills 100% of its parent height/width. */}
            <div className="absolute inset-0">
              <Excalidraw
                excalidrawAPI={handleExcalidrawAPI}
                // Issue 2 fix: snap alignment guides ON by default.
                // initialData appState sets objectsSnapModeEnabled: true.
                // biome-ignore lint/suspicious/noExplicitAny: Excalidraw initialData type is loosely typed in v0.18; elements from snapshot may include deleted elements
                initialData={initialData as any}
              />
            </div>
          </ExcalidrawDropZone>
        </div>
      </DialogContent>
    </Dialog>
  );
};
