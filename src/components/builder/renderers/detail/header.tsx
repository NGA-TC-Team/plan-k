"use client";

import type { BlockRenderer } from "../types";

export const HeaderDetail: BlockRenderer = ({ vm }) => {
  const text = (vm.displayValue.text as string) ?? "";
  const level = ((vm.displayValue.level as number) ?? 1) as 1 | 2 | 3;
  // Type scale tokens: display-sm(28px)/headline(22px)/title(18px) —
  // matches editable-block.tsx HeadingLine tokens for edit/display parity.
  const cls =
    level === 1
      ? "text-display-sm leading-tight font-bold text-foreground"
      : level === 2
        ? "text-headline leading-tight font-semibold text-foreground"
        : "text-title leading-snug font-semibold text-foreground";
  return (
    <div className={cls}>
      {text.length > 0 ? (
        text
      ) : (
        <span className="italic text-muted-foreground">Heading H{level}</span>
      )}
    </div>
  );
};
