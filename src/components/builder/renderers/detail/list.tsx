"use client";

import { cn } from "@/lib/utils";
import type { BlockRenderer } from "../types";

export const ListDetail: BlockRenderer = ({ vm }) => {
  const ordered = Boolean(vm.displayValue.ordered);
  const items = (vm.displayValue.items as string[]) ?? [];
  if (items.length === 0) {
    return (
      <div className="py-2 text-sm italic text-muted-foreground">
        Empty list
      </div>
    );
  }
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag
      className={cn(
        "space-y-1.5 pl-5 text-subhead leading-relaxed",
        ordered ? "list-decimal" : "list-disc",
        "marker:text-muted-foreground/60",
      )}
    >
      {items.map((item, i) => (
        <li key={`${vm.id}-${i}`}>
          {item.length > 0 ? (
            item
          ) : (
            <span className="italic text-muted-foreground/70">Empty item</span>
          )}
        </li>
      ))}
    </Tag>
  );
};
