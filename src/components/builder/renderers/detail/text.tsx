"use client";

import { MarkdownView } from "@/components/builder/markdown/markdown-view";
import type { BlockRenderer } from "../types";

export const TextDetail: BlockRenderer = ({ vm }) => {
  const markdown = (vm.displayValue.markdown as string) ?? "";
  if (markdown.trim().length === 0) {
    return (
      <div className="py-2 text-sm italic text-muted-foreground">
        Empty text — double-click to edit
      </div>
    );
  }
  return <MarkdownView>{markdown}</MarkdownView>;
};
