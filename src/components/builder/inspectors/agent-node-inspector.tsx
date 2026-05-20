"use client";

import { Bot, Tag } from "lucide-react";
import type { AgentNodeInspectViewModel } from "@/builder/projection";
import { Badge } from "@/components/ui/badge";
import { PropertyTable } from "../property-list";
import { PropertyStatus } from "../property-status";

const ROLE_LABEL: Record<AgentNodeInspectViewModel["role"], string> = {
  input: "Input",
  tool: "Tool",
  llm: "LLM",
  output: "Output",
};

type Props = {
  vm: AgentNodeInspectViewModel;
};

export function AgentNodeInspector({ vm }: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="divide-y divide-hairline [&>*]:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
          <header className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-caption gap-1">
                <Bot className="size-3" />
                <span>Agent Node</span>
              </Badge>
              <span className="text-caption font-medium uppercase tracking-eyebrow text-muted-foreground">
                {ROLE_LABEL[vm.role]}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{vm.label}</p>
          </header>

          <section>
            <PropertyStatus entityId={vm.id} kindLabel="Node Status" />
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-eyebrow text-muted-foreground">
              <Tag className="size-3" />
              <span>Meta</span>
            </h2>
            <PropertyTable
              rows={[
                {
                  label: "id",
                  value: (
                    <code className="font-mono text-caption">
                      {vm.id.slice(0, 8)}…
                    </code>
                  ),
                },
                {
                  label: "label",
                  value: <span className="text-caption">{vm.label}</span>,
                },
                {
                  label: "role",
                  value: (
                    <code className="font-mono text-caption">{vm.role}</code>
                  ),
                },
              ]}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
