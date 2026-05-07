"use client";

import { cn } from "@/lib/utils";
import type { BlockRenderer } from "../types";

export const HeaderDetail: BlockRenderer = ({ vm }) => {
  const text = (vm.displayValue.text as string) ?? "";
  const level = ((vm.displayValue.level as number) ?? 1) as 1 | 2 | 3;
  const cls =
    level === 1
      ? "text-3xl font-bold"
      : level === 2
        ? "text-2xl font-semibold"
        : "text-xl font-medium";
  return (
    <div className={cn("py-1", cls)}>
      {text.length > 0 ? (
        text
      ) : (
        <span className="italic text-muted-foreground">Heading H{level}</span>
      )}
    </div>
  );
};
