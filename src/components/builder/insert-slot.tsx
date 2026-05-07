"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { ALL_BLOCK_KINDS, BLOCK_KIND_LABELS } from "@/builder/defaults";
import type { BlockKind } from "@/builder/types/entity";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
        <PopoverContent className="w-56 p-1" sideOffset={6}>
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Insert block
          </div>
          <div className="grid grid-cols-2 gap-1">
            {ALL_BLOCK_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                className="rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                onClick={() => handlePick(kind)}
              >
                {BLOCK_KIND_LABELS[kind]}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
