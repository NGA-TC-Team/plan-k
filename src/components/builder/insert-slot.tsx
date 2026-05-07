"use client";

import { Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { inferContextForParent } from "@/builder/decider/structure";
import { type BlockKindSpec, blockKindsForContext } from "@/builder/defaults";
import type { BlockKind } from "@/builder/types/entity";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useBuilderState } from "@/hooks/builder/use-builder-store.hook";
import { useInsertSlot } from "@/hooks/builder/use-insert-slot.hook";
import { cn } from "@/lib/utils";

type Props = {
  parentId: string;
  index?: number;
  variant?: "between" | "trailing";
};

export function InsertSlot({ parentId, index, variant = "between" }: Props) {
  const [open, setOpen] = useState(false);
  const insert = useInsertSlot(parentId);

  const context = useBuilderState((s) =>
    inferContextForParent(s.state, parentId),
  );
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

  // Auto-focus the popover content when it opens so it can receive keypresses.
  useEffect(() => {
    if (open && contentRef.current) {
      contentRef.current.focus();
    }
  }, [open]);

  const handlePick = (kind: BlockKind) => {
    insert(kind, index);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key.length !== 1) return;
    const spec = shortcutMap.get(e.key.toUpperCase());
    if (!spec) return;
    e.preventDefault();
    handlePick(spec.kind);
  };

  return (
    <div
      className={cn(
        "group/slot relative flex items-center justify-center",
        variant === "between" ? "h-1" : "h-10",
      )}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-opacity",
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
              press a letter
            </div>
          </div>
          {grouped.map(([group, groupSpecs]) => (
            <div key={group} className="mb-1">
              <div className="px-2 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                {group}
              </div>
              <div className="flex flex-col">
                {groupSpecs.map((spec) => (
                  <button
                    key={spec.kind}
                    type="button"
                    className="flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => handlePick(spec.kind)}
                  >
                    <span>{spec.label}</span>
                    {spec.shortcut ? (
                      <kbd className="ml-2 rounded border border-border/60 bg-muted px-1 text-[10px] font-mono text-muted-foreground">
                        {spec.shortcut}
                      </kbd>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
