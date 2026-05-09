"use client";

import { Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type BacklinkRow, useBacklinksQuery } from "@/data/plans/backlinks";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  planId: string;
  mediaId: string;
  /** Badge label — typically the numeric use count. */
  triggerLabel: string | number;
  triggerClassName?: string;
};

// ─── Helper (pure, exported for unit tests) ──────────────────────────────────

/**
 * Formats a BacklinkRow into a display-friendly label + path pair.
 * Exported so the .test file can validate the logic without mounting React.
 */
export function formatBacklinkLabel(row: BacklinkRow): {
  label: string;
  path: string;
} {
  return {
    label: row.label || row.srcId,
    path: row.path.join(" › "),
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * A count badge that, when clicked, opens a popover listing all blocks that
 * reference this media item.
 *
 * Usage:
 *   <MediaUsagePopover planId={planId} mediaId={item.id} triggerLabel={item.useCount} />
 */
export function MediaUsagePopover({
  planId,
  mediaId,
  triggerLabel,
  triggerClassName,
}: Props) {
  const dstId = `media:${mediaId}`;
  const { data, isLoading, isError } = useBacklinksQuery(planId, dstId);

  const refs = data?.refs ?? EMPTY_REFS;
  const count = refs.length;

  return (
    <Popover>
      <PopoverTrigger
        aria-label={`사용 중인 블록 ${triggerLabel}개 — 목록 보기`}
        className={cn(
          "rounded bg-black/60 px-1 py-0.5 text-[10px] font-medium leading-none text-white",
          "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          triggerClassName,
        )}
      >
        {triggerLabel}
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={6}
        className="w-64 p-0"
      >
        {/* Header */}
        <div className="border-b px-3 py-2.5">
          <p className="text-xs font-semibold text-foreground">
            {isLoading
              ? "사용 중인 블록 조회 중…"
              : isError
                ? "목록을 불러오지 못했습니다"
                : `사용 중인 블록 ${count}개`}
          </p>
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="flex h-20 items-center justify-center">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="px-3 py-4 text-center text-xs text-destructive">
            데이터를 불러오는 중 오류가 발생했습니다.
          </div>
        ) : count === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground">
            사용 중인 블록이 없습니다
          </div>
        ) : (
          <ScrollArea className="max-h-[280px]">
            <ul className="divide-y divide-border">
              {refs.map((row) => {
                const { label, path } = formatBacklinkLabel(row);
                return (
                  // v1: 클릭 navigation 비목표 — 단순 정보 노출만
                  <li
                    key={`${row.srcId}::${row.kind}`}
                    className="flex flex-col gap-0.5 px-3 py-2"
                  >
                    <span className="block truncate text-xs font-medium text-foreground">
                      {label}
                    </span>
                    {path ? (
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {path}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ─── Module-level stable empty ref ──────────────────────────────────────────
// Hoisted to avoid `?? []` inline fallback (Zustand/useSyncExternalStore trap).

const EMPTY_REFS: BacklinkRow[] = [];
