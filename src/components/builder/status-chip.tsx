"use client";

import { getEntityStatus } from "@/builder/selectors/entity-status";
import {
  ENTITY_STATUS_VALUES,
  type EntityStatus,
  SECTION_STATUS_VALUES,
} from "@/builder/types/entity";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useBuilderDispatch,
  useBuilderState,
} from "@/hooks/builder/use-builder-store.hook";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<EntityStatus, string> = {
  pending: "Pending",
  "in-progress": "In progress",
  approved: "Approved",
  rejected: "Rejected",
};

const STATUS_DOT_CLASS: Record<EntityStatus, string> = {
  pending: "bg-muted-foreground/40",
  "in-progress": "bg-amber-500",
  approved: "bg-emerald-500",
  rejected: "bg-rose-500",
};

export function statusOf(status: EntityStatus | undefined): EntityStatus {
  return status ?? "pending";
}

export function StatusDot({
  status,
  className,
}: {
  status: EntityStatus | undefined;
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

/**
 * Primitive status chip with dropdown. Caller is responsible for dispatch.
 * Use `EntityStatusChip` when inside a BuilderProvider — it wires dispatch automatically.
 */
export function StatusChipMenu({
  status,
  onChange,
  variant = "dot",
}: {
  status: EntityStatus | undefined;
  onChange: (next: EntityStatus) => void;
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
        {ENTITY_STATUS_VALUES.map((s) => (
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

type EntityStatusChipProps = {
  entityId: string;
  variant?: "dot" | "pill";
};

/**
 * entityMeta + UPDATE_ENTITY_META 흐름을 자동 연결.
 * backlog board / backlog sheet 양쪽에서 재사용.
 * BuilderProvider 안에서만 사용 가능.
 */
export function EntityStatusChip({ entityId, variant }: EntityStatusChipProps) {
  const status = useBuilderState((s) => getEntityStatus(s.state, entityId));
  const dispatch = useBuilderDispatch();
  return (
    <StatusChipMenu
      status={status}
      onChange={(next) =>
        dispatch({
          type: "UPDATE_ENTITY_META",
          entityId,
          patch: { status: next },
        })
      }
      variant={variant}
    />
  );
}

// Re-export alias for callers that import SECTION_STATUS_VALUES from this module.
export { SECTION_STATUS_VALUES };
