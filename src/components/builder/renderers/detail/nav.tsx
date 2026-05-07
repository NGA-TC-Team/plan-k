"use client";

import type { BlockRenderer } from "../types";

type NavItem = { label?: string; href?: string };

export const NavDetail: BlockRenderer = ({ vm }) => {
  const items = (vm.displayValue.items as NavItem[]) ?? [];
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        Empty nav
      </div>
    );
  }
  return (
    <nav className="flex flex-wrap items-center gap-4 border-b py-2">
      {items.map((item, i) => (
        <span
          key={`${vm.id}-${i}`}
          className="text-sm font-medium hover:underline"
        >
          {item.label ?? (
            <span className="italic text-muted-foreground">Item</span>
          )}
        </span>
      ))}
    </nav>
  );
};
