"use client";

import { MarkdownView } from "@/components/builder/markdown/markdown-view";
import type { BlockRenderer } from "../types";

export const TextDetail: BlockRenderer = ({ vm }) => {
  const markdown = (vm.displayValue.markdown as string) ?? "";
  if (markdown.trim().length === 0) {
    return (
      <div className="py-2 text-[15px] italic text-muted-foreground/70">
        Empty text. Double-click to edit.
      </div>
    );
  }
  // prose-doc overrides prose-sm/prose-zinc baseline for docs center-panel.
  return <MarkdownView className="prose-doc">{markdown}</MarkdownView>;
};
