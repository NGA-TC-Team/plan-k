"use client";

import { useCallback, useEffect, useRef } from "react";
import { manifestFor, summaryFor } from "@/builder/blocks/registry";
import { projectBlock } from "@/builder/projection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBlock } from "@/hooks/builder/use-block.hook";
import {
  useBuilderState,
  useBuilderStateShallow,
} from "@/hooks/builder/use-builder-store.hook";
import {
  PANEL_WIDTH_BOUNDS,
  usePanelStore,
  usePanelWidthPersistence,
} from "@/services/stores";
import { PropertyList } from "./property-list";
import { pickEditor } from "./renderers/editors";

export function SidePanel() {
  usePanelWidthPersistence();
  const width = usePanelStore((s) => s.width);
  const setWidth = usePanelStore((s) => s.setWidth);

  const editingId = useBuilderState((s) =>
    s.state.editing.kind === "node" ? s.state.editing.id : null,
  );
  const selectionId = useBuilderState((s) =>
    s.state.selection.kind === "node" ? s.state.selection.id : null,
  );

  const startResize = useResizeHandle(setWidth);

  return (
    <aside
      aria-label="Block properties"
      className="relative hidden border-l text-sm lg:block"
      style={{ width }}
    >
      <button
        type="button"
        aria-label="Resize properties panel"
        onPointerDown={startResize}
        className="absolute left-0 top-0 bottom-0 w-1 -translate-x-1/2 cursor-col-resize bg-transparent hover:bg-border"
      />
      <div className="h-full overflow-y-auto p-3">
        {editingId ? (
          <EditorPane key={editingId} blockId={editingId} />
        ) : selectionId ? (
          <InspectPane blockId={selectionId} />
        ) : (
          <IdleState />
        )}
      </div>
    </aside>
  );
}

function IdleState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
      <div className="font-medium text-foreground">Select a block</div>
      <div>
        Click to select · Double-click or <kbd>Enter</kbd> to edit
      </div>
    </div>
  );
}

function EditorPane({ blockId }: { blockId: string }) {
  const { vm, handlers } = useBlock(blockId);
  if (!vm) return <FallbackMessage>Block missing</FallbackMessage>;
  const Editor = pickEditor(vm.context, vm.kind);
  return (
    <div className="flex h-full flex-col">
      <Editor vm={vm} handlers={handlers} />
    </div>
  );
}

function InspectPane({ blockId }: { blockId: string }) {
  const vm = useBuilderStateShallow((s) => projectBlock(s.state, blockId));
  const { handlers } = useBlock(blockId);
  if (!vm) return <FallbackMessage>Block missing</FallbackMessage>;
  const manifest = manifestFor(vm.kind);
  const summary = summaryFor(vm.kind, vm.data);

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {manifest.label}
          </Badge>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {manifest.group}
          </span>
          {vm.isPending ? (
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300">
              Saving…
            </Badge>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{summary}</p>
      </header>

      <section>
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Properties
        </h2>
        <PropertyList kind={vm.kind} data={vm.data} />
      </section>

      <section className="space-y-1">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handlers.onBeginEdit}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handlers.onDelete}
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            Delete
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          <kbd>Enter</kbd> to edit · <kbd>Delete</kbd> to remove · <kbd>⌘Z</kbd>{" "}
          to undo
        </p>
      </section>

      <section>
        <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Meta
        </h2>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <dt>id</dt>
          <dd>
            <code className="font-mono">{vm.id.slice(0, 8)}…</code>
          </dd>
          <dt>parent</dt>
          <dd>
            <code className="font-mono">{vm.parentId.slice(0, 8)}…</code>
          </dd>
          <dt>sync</dt>
          <dd>{vm.isPending ? "⏳ pending" : "✓ saved"}</dd>
        </dl>
      </section>
    </div>
  );
}

function FallbackMessage({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-muted-foreground">{children}</div>;
}

/**
 * Drag the resizer handle to change panel width. Clamped via the store's
 * `setWidth` (PANEL_WIDTH_BOUNDS).
 */
function useResizeHandle(setWidth: (w: number) => void) {
  const startXRef = useRef(0);
  const startWRef = useRef(0);

  const onMove = useCallback(
    (e: PointerEvent) => {
      const delta = startXRef.current - e.clientX;
      setWidth(startWRef.current + delta);
    },
    [setWidth],
  );

  const onUp = useCallback(() => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    document.body.style.cursor = "";
  }, [onMove]);

  useEffect(() => () => onUp(), [onUp]);

  return (e: React.PointerEvent) => {
    startXRef.current = e.clientX;
    startWRef.current =
      usePanelStore.getState().width || PANEL_WIDTH_BOUNDS.default;
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
}
