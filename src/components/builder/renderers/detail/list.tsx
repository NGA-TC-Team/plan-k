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
        "py-2 pl-6 text-sm",
        ordered ? "list-decimal" : "list-disc",
      )}
    >
      {items.map((item, i) => (
        <li key={`${vm.id}-${i}`}>
          {item.length > 0 ? (
            item
          ) : (
            <span className="italic text-muted-foreground">Empty item</span>
          )}
        </li>
      ))}
    </Tag>
  );
};
