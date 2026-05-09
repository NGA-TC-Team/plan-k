"use client";

import { Monitor, Tag } from "lucide-react";
import type { ScreenInspectViewModel } from "@/builder/projection";
import { Badge } from "@/components/ui/badge";
import { PropertyTable } from "../property-list";
import { PropertyStatus } from "../property-status";

type Props = {
  vm: ScreenInspectViewModel;
};

export function ScreenInspector({ vm }: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="divide-y divide-hairline [&>*]:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
          <header className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] gap-1">
                <Monitor className="size-3" />
                <span>Screen</span>
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">{vm.title}</p>
          </header>

          <section>
            <PropertyStatus entityId={vm.id} kindLabel="Screen Status" />
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Tag className="size-3" />
              <span>Meta</span>
            </h2>
            <PropertyTable
              rows={[
                {
                  label: "id",
                  value: (
                    <code className="font-mono text-[11px]">
                      {vm.id.slice(0, 8)}…
                    </code>
                  ),
                },
                {
                  label: "title",
                  value: <span className="text-[11px]">{vm.title}</span>,
                },
                ...(vm.route
                  ? [
                      {
                        label: "route",
                        value: (
                          <code className="font-mono text-[11px]">
                            {vm.route}
                          </code>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
