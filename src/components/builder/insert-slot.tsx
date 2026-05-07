"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
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

  const grouped = useMemo(() => {
    const specs = blockKindsForContext(context, platform);
    const byGroup = new Map<string, BlockKindSpec[]>();
    for (const s of specs) {
      const list = byGroup.get(s.group) ?? [];
      list.push(s);
      byGroup.set(s.group, list);
    }
    return Array.from(byGroup.entries());
  }, [context, platform]);

  const handlePick = (kind: BlockKind) => {
    insert(kind, index);
    setOpen(false);
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
          className="w-72 max-h-[60vh] overflow-y-auto p-1"
          sideOffset={6}
        >
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Insert {context} block
          </div>
          {grouped.map(([group, specs]) => (
            <div key={group} className="mb-1">
              <div className="px-2 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                {group}
              </div>
              <div className="grid grid-cols-2 gap-0.5">
                {specs.map((spec) => (
                  <button
                    key={spec.kind}
                    type="button"
                    className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => handlePick(spec.kind)}
                  >
                    {spec.label}
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
