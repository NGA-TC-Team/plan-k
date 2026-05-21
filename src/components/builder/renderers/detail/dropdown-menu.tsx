"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BlockRenderer } from "../types";

// ── type helpers ─────────────────────────────────────────────────────────────

type DropdownItem = {
  label: string;
  icon: string;
  action: string;
  divider: boolean;
};

function isDropdownItem(v: unknown): v is DropdownItem {
  return (
    typeof v === "object" &&
    v !== null &&
    "label" in v &&
    typeof (v as Record<string, unknown>).label === "string"
  );
}

// ── main detail ───────────────────────────────────────────────────────────────

export const DropdownMenuDetail: BlockRenderer = ({ vm }) => {
  const dv = vm.displayValue;
  const trigger =
    typeof dv.trigger === "string" && dv.trigger.trim().length > 0
      ? dv.trigger
      : "Options";
  const rawItems = Array.isArray(dv.items) ? dv.items : [];
  const items: DropdownItem[] = rawItems.filter(isDropdownItem).map((it) => ({
    label: it.label,
    icon: typeof it.icon === "string" ? it.icon : "",
    action: typeof it.action === "string" ? it.action : "",
    divider: it.divider === true,
  }));

  return (
    <div className="inline-flex flex-col items-start gap-1 min-w-[140px]">
      {/* Trigger button */}
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
      >
        {trigger}
        <ChevronDown className="size-3 text-muted-foreground" />
      </button>

      {/* Open menu panel — static mockup */}
      <div className="w-full rounded-md border border-hairline bg-popover shadow-md py-1">
        {items.length === 0 ? (
          <p className="px-3 py-1.5 text-[11px] italic text-muted-foreground/70">
            No items
          </p>
        ) : (
          items.map((item, idx) => (
            <div key={`${idx}-${item.label}`}>
              {item.divider && idx > 0 && (
                <hr className="my-1 border-hairline" />
              )}
              <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-default">
                {/* Icon dot — we don't dynamically resolve lucide icons by string at runtime */}
                {item.icon ? (
                  <span
                    className="inline-block size-2 rounded-full bg-muted-foreground/40"
                    aria-hidden
                  />
                ) : null}
                <span
                  className={cn(
                    "text-xs",
                    item.label
                      ? "text-foreground"
                      : "italic text-muted-foreground/60",
                  )}
                >
                  {item.label || "Item"}
                </span>
                {item.action ? (
                  <span className="ml-auto text-[10px] text-muted-foreground/60">
                    {item.action}
                  </span>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
