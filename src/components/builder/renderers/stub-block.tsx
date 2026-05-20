"use client";

import { BLOCK_KIND_REGISTRY } from "@/builder/defaults";
import type { BlockRenderer, RendererProps } from "./types";

// Generic placeholder for kinds whose real renderer hasn't shipped yet.
// Shows the kind label + a one-line summary of the data so the page
// remains intelligible until a dedicated component lands.
export const StubBlock: BlockRenderer = ({ vm }: RendererProps) => {
  const spec = BLOCK_KIND_REGISTRY.find(
    (s) => s.context === vm.context && s.kind === vm.kind,
  );
  const label = spec?.label ?? vm.kind;
  const summary = summarize(vm.displayValue);
  return (
    <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-3 text-xs">
      <div className="mb-1 text-caption font-medium uppercase tracking-eyebrow text-muted-foreground">
        {label}
      </div>
      {summary ? (
        <div className="line-clamp-3 text-foreground/80">{summary}</div>
      ) : (
        <div className="italic text-muted-foreground">empty</div>
      )}
    </div>
  );
};

function summarize(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const v = value as Record<string, unknown>;
  for (const key of [
    "title",
    "name",
    "label",
    "text",
    "markdown",
    "question",
    "risk",
  ]) {
    const candidate = v[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate;
  }
  return JSON.stringify(value).slice(0, 120);
}
