"use client";

import type { BlockRenderer } from "../types";
import { WireBar, WireBox } from "./primitives";

const ROLE_DOT: Record<string, string> = {
  input: "bg-blue-400/80",
  tool: "bg-amber-400/80",
  llm: "bg-purple-400/80",
  output: "bg-emerald-400/80",
};

export const AgentStepWireframe: BlockRenderer = ({ vm }) => {
  const role = ((vm.displayValue.role as string) ?? "input") as string;
  const dot = ROLE_DOT[role] ?? "bg-ink-tertiary";
  return (
    <WireBox className="flex items-center gap-3 px-3 py-3">
      <span className={`size-3 shrink-0 rounded-full ${dot}`} />
      <span className="rounded-sm bg-surface-2 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-ink-subtle">
        {role}
      </span>
      <div className="flex-1 space-y-1.5">
        <WireBar className="w-3/5" />
        <WireBar className="h-1.5 w-2/5" />
      </div>
    </WireBox>
  );
};
