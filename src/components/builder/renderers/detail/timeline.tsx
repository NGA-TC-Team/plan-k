"use client";

import { CheckCircle2, Circle, TriangleAlert, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { BlockRenderer } from "../types";

// Status → node styling
const STATUS_STYLES: Record<string, { dot: string; icon: ReactNode }> = {
  default: {
    dot: "bg-muted-foreground/40 border-muted-foreground/20",
    icon: <Circle className="size-3" />,
  },
  success: {
    dot: "bg-emerald-500 border-emerald-400",
    icon: <CheckCircle2 className="size-3" />,
  },
  warning: {
    dot: "bg-amber-500 border-amber-400",
    icon: <TriangleAlert className="size-3" />,
  },
  danger: {
    dot: "bg-red-500 border-red-400",
    icon: <XCircle className="size-3" />,
  },
};

interface TimelineItem {
  title: string;
  time: string;
  body: string;
  status: string;
}

function safeDot(status: string) {
  return STATUS_STYLES[status] ?? STATUS_STYLES.default;
}

function VerticalTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative space-y-3 pl-4">
      {/* Connector line — absolute, behind nodes */}
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-muted-foreground/15" />
      {items.map((item, i) => {
        const { dot } = safeDot(item.status);
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: stable positional key
          <li key={i} className="relative">
            {/* Node dot */}
            <span
              className={cn(
                "absolute -left-4 top-1 size-3.5 rounded-full border",
                dot,
              )}
            />
            <div className="ml-1 space-y-0.5">
              <div className="flex items-baseline gap-2">
                {item.title ? (
                  <span className="text-xs font-medium leading-tight">
                    {item.title}
                  </span>
                ) : null}
                {item.time ? (
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {item.time}
                  </span>
                ) : null}
              </div>
              {item.body ? (
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {item.body}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function HorizontalTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className="relative overflow-x-auto">
      {/* Horizontal connector line */}
      <div className="absolute top-[7px] left-0 right-0 h-px bg-muted-foreground/15" />
      <ol className="flex gap-4 pb-1">
        {items.map((item, i) => {
          const { dot } = safeDot(item.status);
          return (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: stable positional key
              key={i}
              className="relative flex flex-col items-center min-w-[72px]"
            >
              <span
                className={cn(
                  "relative z-10 size-3.5 rounded-full border",
                  dot,
                )}
              />
              <div className="mt-2 text-center space-y-0.5">
                {item.title ? (
                  <div className="text-[10px] font-medium leading-tight line-clamp-2">
                    {item.title}
                  </div>
                ) : null}
                {item.time ? (
                  <div className="text-[9px] text-muted-foreground">
                    {item.time}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export const TimelineDetail: BlockRenderer = ({ vm }) => {
  const dv = vm.displayValue;
  const orientation =
    typeof dv.orientation === "string" ? dv.orientation : "vertical";
  const rawItems = Array.isArray(dv.items)
    ? (dv.items as Array<Record<string, unknown>>)
    : [];

  const items: TimelineItem[] = rawItems.map((it) => ({
    title: typeof it.title === "string" ? it.title : "",
    time: typeof it.time === "string" ? it.time : "",
    body: typeof it.body === "string" ? it.body : "",
    status: typeof it.status === "string" ? it.status : "default",
  }));

  if (items.length === 0) {
    return (
      <span className="italic text-xs text-muted-foreground/60">No items</span>
    );
  }

  return orientation === "horizontal" ? (
    <HorizontalTimeline items={items} />
  ) : (
    <VerticalTimeline items={items} />
  );
};
