"use client";

import { Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { iconForBlock, iconForGroup } from "@/builder/blocks/icons";
import { inferContextForParent } from "@/builder/decider/structure";
import { type BlockKindSpec, blockKindsForContext } from "@/builder/defaults";
import type { BlockKind } from "@/builder/types/entity";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useBuilderDispatch,
  useBuilderState,
} from "@/hooks/builder/use-builder-store.hook";
import { useInsertSlot } from "@/hooks/builder/use-insert-slot.hook";
import { cn } from "@/lib/utils";
import { useBlockDragStore, useInsertMruStore } from "@/services/stores";

type Props = {
  parentId: string;
  index?: number;
  variant?: "between" | "trailing";
};

export function InsertSlot({ parentId, index, variant = "between" }: Props) {
  const [open, setOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const insert = useInsertSlot(parentId);
  const dispatch = useBuilderDispatch();

  const draggingId = useBlockDragStore((s) => s.draggingId);
  const dragContext = useBlockDragStore((s) => s.context);
  const endDrag = useBlockDragStore((s) => s.end);

  const context = useBuilderState((s) =>
    inferContextForParent(s.state, parentId),
  );

  const dragActive =
    draggingId !== null && dragContext === context && draggingId !== parentId;
  const planKind = useBuilderState(
    (s) => Object.values(s.state.plans)[0]?.kind ?? null,
  );
  const platform: "mobile" | "web" = planKind === "mobile" ? "mobile" : "web";

  const specs = useMemo(
    () => blockKindsForContext(context, platform),
    [context, platform],
  );

  const grouped = useMemo(() => {
    const byGroup = new Map<string, BlockKindSpec[]>();
    for (const s of specs) {
      const list = byGroup.get(s.group) ?? [];
      list.push(s);
      byGroup.set(s.group, list);
    }
    return Array.from(byGroup.entries());
  }, [specs]);

  // Map shortcut letters to specs for fast lookup while the popover is open.
  const shortcutMap = useMemo(() => {
    const map = new Map<string, BlockKindSpec>();
    for (const s of specs) {
      if (s.shortcut) map.set(s.shortcut.toUpperCase(), s);
    }
    return map;
  }, [specs]);

  const contentRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");

  const mruKinds = useInsertMruStore((s) => s.mru[context] ?? []);
  const pushMru = useInsertMruStore((s) => s.push);

  const recentSpecs = useMemo(() => {
    if (mruKinds.length === 0) return [];
    const bySpec = new Map(specs.map((s) => [s.kind, s]));
    return mruKinds.flatMap((k) => {
      const s = bySpec.get(k);
      return s ? [s] : [];
    });
  }, [mruKinds, specs]);

  const filteredSpecs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return specs.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.group.toLowerCase().includes(q) ||
        s.kind.toLowerCase().includes(q),
    );
  }, [query, specs]);

  // Reset search + focus the input on open so users can start typing.
  useEffect(() => {
    if (open) {
      setQuery("");
      // Defer focus past the popover mount + autofocus race.
      const id = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  const handlePick = (kind: BlockKind) => {
    insert(kind, index);
    pushMru(context, kind);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    // While the search input is focused, don't intercept letter keys —
    // they should reach the input. The shortcut hot-keys still work via
    // the popover content keydown when focus is anywhere else.
    if (e.target instanceof HTMLInputElement) return;
    if (e.key.length !== 1) return;
    const spec = shortcutMap.get(e.key.toUpperCase());
    if (!spec) return;
    e.preventDefault();
    handlePick(spec.kind);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const blockId = e.dataTransfer.getData("application/x-block-id");
    if (!blockId) {
      endDrag();
      return;
    }
    const targetIndex = index ?? 0;
    // Same-parent drops: indices in the reducer are computed against the
    // sibling list with the dragged node already filtered out, so dropping
    // at the slot position is correct as-is.
    dispatch({
      type: "MOVE_BLOCK",
      nodeId: blockId,
      toParentId: parentId,
      index: targetIndex,
    });
    endDrag();
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drop target is purely visual; pointer/keyboard insertion uses the popover trigger.
    <div
      className={cn(
        "group/slot relative flex items-center justify-center transition-[height,background-color]",
        variant === "between" ? (dragActive ? "h-5" : "h-1") : "h-10",
        dragOver && "h-10",
      )}
      onDragOver={
        dragActive
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = "move";
              if (!dragOver) setDragOver(true);
            }
          : undefined
      }
      onDragLeave={dragActive ? () => setDragOver(false) : undefined}
      onDrop={dragActive ? handleDrop : undefined}
    >
      {dragOver ? (
        <div className="pointer-events-none absolute inset-x-2 top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary" />
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full border bg-background text-muted-foreground transition-opacity",
            "hover:bg-accent hover:text-accent-foreground",
            variant === "between" &&
              "opacity-0 group-hover/slot:opacity-100 data-[popup-open]:opacity-100",
          )}
          aria-label="Insert block"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Plus className="h-3.5 w-3.5" />
        </PopoverTrigger>
        <PopoverContent
          ref={contentRef}
          className="w-72 max-h-[60vh] overflow-y-auto p-1 outline-none"
          sideOffset={6}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="text-xs font-medium text-muted-foreground">
              Insert {context} block
            </div>
            <div className="text-[10px] text-muted-foreground/70">
              {query ? "filtered" : "press a letter"}
            </div>
          </div>
          <div className="px-1.5 pb-1.5">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="블록 검색..."
              className="h-7 w-full rounded-md border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  if (query) {
                    e.preventDefault();
                    setQuery("");
                  }
                } else if (e.key === "Enter") {
                  const first = filteredSpecs?.[0];
                  if (first) {
                    e.preventDefault();
                    handlePick(first.kind);
                  }
                }
              }}
            />
          </div>
          {filteredSpecs ? (
            <div className="flex flex-col px-1 pb-1">
              {filteredSpecs.length === 0 ? (
                <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                  일치하는 블록 없음
                </div>
              ) : (
                filteredSpecs.map((spec) => {
                  const BlockIcon = iconForBlock(spec.kind);
                  return (
                    <button
                      key={spec.kind}
                      type="button"
                      className="flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                      onClick={() => handlePick(spec.kind)}
                    >
                      <span className="flex items-center gap-2">
                        <BlockIcon className="size-3.5 text-muted-foreground" />
                        <span>{spec.label}</span>
                        <span className="text-[10px] text-muted-foreground/70">
                          {spec.group}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          ) : null}
          {!filteredSpecs && recentSpecs.length > 0 ? (
            <div className="mb-1">
              <div className="flex items-center gap-1.5 px-2 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                <span>Recent</span>
              </div>
              <div className="flex flex-col">
                {recentSpecs.map((spec) => {
                  const BlockIcon = iconForBlock(spec.kind);
                  return (
                    <button
                      key={`recent-${spec.kind}`}
                      type="button"
                      className="flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                      onClick={() => handlePick(spec.kind)}
                    >
                      <span className="flex items-center gap-2">
                        <BlockIcon className="size-3.5 text-muted-foreground" />
                        <span>{spec.label}</span>
                      </span>
                      {spec.shortcut ? (
                        <kbd className="ml-2 rounded-sm border border-border/60 bg-muted px-1 text-[10px] font-mono text-muted-foreground">
                          {spec.shortcut}
                        </kbd>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          {!filteredSpecs &&
            grouped.map(([group, groupSpecs]) => {
              const GroupIcon = iconForGroup(group);
              return (
                <div key={group} className="mb-1">
                  <div className="flex items-center gap-1.5 px-2 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                    <GroupIcon className="size-3" />
                    <span>{group}</span>
                  </div>
                  <div className="flex flex-col">
                    {groupSpecs.map((spec) => {
                      const BlockIcon = iconForBlock(spec.kind);
                      return (
                        <button
                          key={spec.kind}
                          type="button"
                          className="flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                          onClick={() => handlePick(spec.kind)}
                        >
                          <span className="flex items-center gap-2">
                            <BlockIcon className="size-3.5 text-muted-foreground" />
                            <span>{spec.label}</span>
                          </span>
                          {spec.shortcut ? (
                            <kbd className="ml-2 rounded-sm border border-border/60 bg-muted px-1 text-[10px] font-mono text-muted-foreground">
                              {spec.shortcut}
                            </kbd>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </PopoverContent>
      </Popover>
    </div>
  );
}
