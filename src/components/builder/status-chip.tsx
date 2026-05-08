"use client";

import {
  SECTION_STATUS_VALUES,
  type SectionStatus,
} from "@/builder/types/entity";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<SectionStatus, string> = {
  pending: "Pending",
  "in-progress": "In progress",
  approved: "Approved",
  rejected: "Rejected",
};

const STATUS_DOT_CLASS: Record<SectionStatus, string> = {
  pending: "bg-muted-foreground/40",
  "in-progress": "bg-amber-500",
  approved: "bg-emerald-500",
  rejected: "bg-rose-500",
};

export function statusOf(status: SectionStatus | undefined): SectionStatus {
  return status ?? "pending";
}

export function StatusDot({
  status,
  className,
}: {
  status: SectionStatus | undefined;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        STATUS_DOT_CLASS[statusOf(status)],
        className,
      )}
      title={STATUS_LABEL[statusOf(status)]}
    />
  );
}

export function StatusChipMenu({
  status,
  onChange,
  variant = "dot",
}: {
  status: SectionStatus | undefined;
  onChange: (next: SectionStatus) => void;
  variant?: "dot" | "pill";
}) {
  const current = statusOf(status);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={`Status: ${STATUS_LABEL[current]}`}
            title={`Status: ${STATUS_LABEL[current]}`}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "shrink-0 rounded-full border border-transparent transition-colors hover:border-border",
              variant === "dot"
                ? "flex size-5 items-center justify-center"
                : "flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
            )}
          >
            <span
              className={cn(
                "inline-block size-2 rounded-full",
                STATUS_DOT_CLASS[current],
              )}
            />
            {variant === "pill" ? <span>{STATUS_LABEL[current]}</span> : null}
          </button>
        }
      />
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {SECTION_STATUS_VALUES.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={(e) => {
              e.stopPropagation();
              onChange(s);
            }}
          >
            <span
              className={cn(
                "inline-block size-2 shrink-0 rounded-full",
                STATUS_DOT_CLASS[s],
              )}
            />
            <span>{STATUS_LABEL[s]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
