"use client";

import { cn } from "@/lib/utils";
import type { BlockRenderer } from "../types";

// ── side positioning helpers ──────────────────────────────────────────────────

type PopoverSide = "top" | "right" | "bottom" | "left";

const ALLOWED_SIDES: readonly PopoverSide[] = [
  "top",
  "right",
  "bottom",
  "left",
];

function safeSide(v: unknown): PopoverSide {
  return ALLOWED_SIDES.includes(v as PopoverSide)
    ? (v as PopoverSide)
    : "bottom";
}

// Flex direction + order to position popover card relative to trigger.
const SIDE_CLASSES: Record<
  PopoverSide,
  { wrapper: string; cardOrder: string; triggerOrder: string; arrow: string }
> = {
  top: {
    wrapper: "flex flex-col items-center gap-1",
    cardOrder: "order-first",
    triggerOrder: "order-last",
    // Arrow pointing down (card is above trigger)
    arrow:
      "w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-border",
  },
  bottom: {
    wrapper: "flex flex-col items-center gap-1",
    cardOrder: "order-last",
    triggerOrder: "order-first",
    // Arrow pointing up
    arrow:
      "w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-border",
  },
  left: {
    wrapper: "flex flex-row items-center gap-1",
    cardOrder: "order-first",
    triggerOrder: "order-last",
    arrow:
      "w-0 h-0 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-border",
  },
  right: {
    wrapper: "flex flex-row items-center gap-1",
    cardOrder: "order-last",
    triggerOrder: "order-first",
    arrow:
      "w-0 h-0 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-border",
  },
};

// ── main detail ───────────────────────────────────────────────────────────────

export const PopoverDetail: BlockRenderer = ({ vm }) => {
  const dv = vm.displayValue;
  const trigger =
    typeof dv.trigger === "string" && dv.trigger.trim().length > 0
      ? dv.trigger
      : "Open";
  const title = typeof dv.title === "string" ? dv.title.trim() : "";
  const body = typeof dv.body === "string" ? dv.body : "";
  const side = safeSide(dv.side);
  const withArrow = dv.withArrow !== false;
  const cls = SIDE_CLASSES[side];

  return (
    <div className={cn("inline-flex", cls.wrapper)}>
      {/* Trigger button */}
      <button
        type="button"
        className={cn(
          "rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent",
          cls.triggerOrder,
        )}
      >
        {trigger}
      </button>

      {/* Arrow connector */}
      {withArrow && <span className={cls.arrow} aria-hidden />}

      {/* Popover card */}
      <div
        className={cn(
          "max-w-[220px] rounded-md border border-border bg-popover shadow-md p-3",
          cls.cardOrder,
        )}
      >
        {title ? (
          <p className="text-xs font-semibold text-foreground mb-1">{title}</p>
        ) : null}
        <p
          className={cn(
            "text-xs leading-snug",
            body ? "text-muted-foreground" : "italic text-muted-foreground/60",
          )}
        >
          {body || "Popover content"}
        </p>
      </div>
    </div>
  );
};
