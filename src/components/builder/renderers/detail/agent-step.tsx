"use client";

import { cn } from "@/lib/utils";
import type { BlockRenderer } from "../types";

const ROLE_STYLES: Record<string, string> = {
  input: "border-blue-300 bg-blue-50 dark:bg-blue-950/40",
  tool: "border-amber-300 bg-amber-50 dark:bg-amber-950/40",
  llm: "border-purple-300 bg-purple-50 dark:bg-purple-950/40",
  output: "border-green-300 bg-green-50 dark:bg-green-950/40",
};

export const AgentStepDetail: BlockRenderer = ({ vm }) => {
  const role = ((vm.displayValue.role as string) ?? "input").toLowerCase();
  const spec = vm.displayValue.spec ?? {};
  const cls = ROLE_STYLES[role] ?? "border-hairline bg-surface-1";
  return (
    <div className={cn("rounded-md border-2 p-3", cls)}>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide">
        {role}
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap text-[11px] leading-snug">
        {JSON.stringify(spec, null, 2)}
      </pre>
    </div>
  );
};
