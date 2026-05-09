"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { compareSnapshots } from "@/builder/diff/compare-snapshots";
import { diffBlockText, extractTextForDiff } from "@/builder/diff/text-diff";
import type { DiffReport, EntityDiffEntry } from "@/builder/diff/types";
import type { BlockEntity } from "@/builder/types/entity";
import type { AppState } from "@/builder/types/state";
import { usePlanVersionQuery } from "@/data/plan-versions";
import { useActiveBuilderStore } from "@/services/stores/active-builder.store";

type DiffPanelProps = {
  planId: string;
  versionId: string;
  onBack: () => void;
};

// ---------------------------------------------------------------------------
// DiffPanel — main entry point
// ---------------------------------------------------------------------------
export function DiffPanel({ planId, versionId, onBack }: DiffPanelProps) {
  const {
    data: version,
    isLoading,
    isError,
    error,
  } = usePlanVersionQuery(planId, versionId);

  // Read the live builder snapshot from the active store (best-effort).
  // useActiveBuilderStore holds the BuilderStore hook set by BuilderProvider.
  const builderStoreHook = useActiveBuilderStore((s) => s.store);
  const liveState: AppState | null = builderStoreHook
    ? builderStoreHook((s) => s.state)
    : null;

  // Parse the version snapshot (JSON string). Handle errors gracefully.
  const parsedResult = useMemo<
    { ok: true; snapshot: AppState } | { ok: false; message: string } | null
  >(() => {
    if (!version) return null;
    try {
      return { ok: true, snapshot: JSON.parse(version.snapshot) as AppState };
    } catch (e) {
      return {
        ok: false,
        message: e instanceof Error ? e.message : "Invalid snapshot JSON",
      };
    }
  }, [version]);

  // Compute diff report only when both snapshots are ready.
  const report = useMemo<DiffReport | null>(() => {
    if (!parsedResult || !parsedResult.ok || !liveState) return null;
    try {
      return compareSnapshots(parsedResult.snapshot, liveState);
    } catch {
      return null;
    }
  }, [parsedResult, liveState]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to version list"
          className="flex items-center gap-1 rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-sm">
            {version?.label ?? "Loading…"}
          </p>
          <p className="text-xs text-muted-foreground">vs current</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <DiffSkeleton />
        ) : isError ? (
          <DiffError message={String(error)} />
        ) : parsedResult && !parsedResult.ok ? (
          <DiffError
            message={`Snapshot parse error: ${parsedResult.message}`}
          />
        ) : !liveState ? (
          <DiffError message="Builder is not loaded. Open the plan first." />
        ) : !report ? (
          <DiffError message="Failed to compute diff." />
        ) : (
          <DiffBody
            report={report}
            // Pass the version snapshot blocks for text extraction
            versionBlocks={
              parsedResult?.ok ? (parsedResult.snapshot.blocks ?? {}) : {}
            }
            liveBlocks={liveState?.blocks ?? {}}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DiffBody — 4 bucket groups
// ---------------------------------------------------------------------------

type DiffBodyProps = {
  report: DiffReport;
  versionBlocks: Record<string, BlockEntity>;
  liveBlocks: Record<string, BlockEntity>;
};

function DiffBody({ report, versionBlocks, liveBlocks }: DiffBodyProps) {
  const allEmpty =
    report.added.length === 0 &&
    report.removed.length === 0 &&
    report.modified.length === 0 &&
    report.moved.length === 0;

  if (allEmpty) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        No changes between this version and current.
      </p>
    );
  }

  return (
    <div className="divide-y">
      <BucketGroup
        label="Added"
        entries={report.added}
        defaultOpen={report.added.length > 0}
        versionBlocks={versionBlocks}
        liveBlocks={liveBlocks}
        variant="added"
      />
      <BucketGroup
        label="Removed"
        entries={report.removed}
        defaultOpen={report.removed.length > 0}
        versionBlocks={versionBlocks}
        liveBlocks={liveBlocks}
        variant="removed"
      />
      <BucketGroup
        label="Modified"
        entries={report.modified}
        defaultOpen={report.modified.length > 0}
        versionBlocks={versionBlocks}
        liveBlocks={liveBlocks}
        variant="modified"
      />
      <MovedGroup moved={report.moved} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// BucketGroup — collapsible section for added/removed/modified
// ---------------------------------------------------------------------------

type BucketVariant = "added" | "removed" | "modified";

type BucketGroupProps = {
  label: string;
  entries: EntityDiffEntry[];
  defaultOpen: boolean;
  versionBlocks: Record<string, BlockEntity>;
  liveBlocks: Record<string, BlockEntity>;
  variant: BucketVariant;
};

function BucketGroup({
  label,
  entries,
  defaultOpen,
  versionBlocks,
  liveBlocks,
  variant,
}: BucketGroupProps) {
  const [open, setOpen] = useState(defaultOpen);

  const badgeClass =
    variant === "added"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
      : variant === "removed"
        ? "bg-rose-500/15 text-rose-700 dark:text-rose-400"
        : "bg-amber-500/15 text-amber-700 dark:text-amber-400";

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-accent/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">{label}</span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums ${badgeClass}`}
          >
            {entries.length}
          </span>
        </div>
      </button>

      {open && entries.length > 0 && (
        <ul className="pb-1">
          {entries.map((entry) => (
            <li key={`${entry.kind}:${entry.id}`}>
              <EntityRow
                entry={entry}
                versionBlocks={versionBlocks}
                liveBlocks={liveBlocks}
                variant={variant}
              />
            </li>
          ))}
        </ul>
      )}

      {open && entries.length === 0 && (
        <p className="px-8 pb-2 text-xs text-muted-foreground">None</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EntityRow — single entity entry; modified text blocks are expandable
// ---------------------------------------------------------------------------

type EntityRowProps = {
  entry: EntityDiffEntry;
  versionBlocks: Record<string, BlockEntity>;
  liveBlocks: Record<string, BlockEntity>;
  variant: BucketVariant;
};

function EntityRow({
  entry,
  versionBlocks,
  liveBlocks,
  variant,
}: EntityRowProps) {
  const isModifiedBlock = variant === "modified" && entry.kind === "block";

  // Only show expand affordance for modified text-bearing blocks
  const canExpand =
    isModifiedBlock &&
    (entry.changedFields?.includes("data") ?? false) &&
    (extractTextForDiff(liveBlocks[entry.id] ?? EMPTY_BLOCK) !== null ||
      extractTextForDiff(versionBlocks[entry.id] ?? EMPTY_BLOCK) !== null);

  const [expanded, setExpanded] = useState(false);

  const leftBorderClass =
    variant === "added"
      ? "border-l-2 border-l-emerald-500/60"
      : variant === "removed"
        ? "border-l-2 border-l-rose-500/60"
        : "border-l-2 border-l-amber-500/60";

  const rowContent = (
    <>
      {canExpand ? (
        expanded ? (
          <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="size-3 shrink-0 text-muted-foreground" />
        )
      ) : (
        <span className="size-3" />
      )}

      <span className="text-xs text-muted-foreground shrink-0">
        {entry.kind}
      </span>
      <span className="truncate text-xs">
        {entry.label ?? entry.blockKind ?? entry.id}
      </span>
      {(entry.changedFields?.length ?? 0) > 0 && (
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          {entry.changedFields?.join(", ")}
        </span>
      )}
      {(entry.metaChanges?.length ?? 0) > 0 && (
        <span className="ml-auto shrink-0 text-xs text-muted-foreground/70">
          meta
        </span>
      )}
    </>
  );

  return (
    <div className={`ml-8 ${leftBorderClass}`}>
      {canExpand ? (
        <button
          type="button"
          className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-accent/30 transition-colors"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {rowContent}
        </button>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1.5">{rowContent}</div>
      )}

      {canExpand && expanded && (
        <LineDiffView
          blockId={entry.id}
          versionBlocks={versionBlocks}
          liveBlocks={liveBlocks}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LineDiffView — lazily computed line diff (only runs when expanded)
// ---------------------------------------------------------------------------

type LineDiffViewProps = {
  blockId: string;
  versionBlocks: Record<string, BlockEntity>;
  liveBlocks: Record<string, BlockEntity>;
};

// Memoised inside the component to avoid eager computation
function LineDiffView({
  blockId,
  versionBlocks,
  liveBlocks,
}: LineDiffViewProps) {
  const parts = useMemo(() => {
    const before =
      extractTextForDiff(versionBlocks[blockId] ?? EMPTY_BLOCK) ?? "";
    const after = extractTextForDiff(liveBlocks[blockId] ?? EMPTY_BLOCK) ?? "";
    return diffBlockText(before, after);
  }, [blockId, versionBlocks, liveBlocks]);

  return (
    <div className="mx-3 mb-2 overflow-x-auto rounded border text-xs">
      <pre className="p-2 leading-5 whitespace-pre-wrap break-words">
        {parts.map((part, i) => {
          const bg = part.added
            ? "bg-emerald-500/10"
            : part.removed
              ? "bg-rose-500/10"
              : "";
          const text = part.added
            ? "text-emerald-700 dark:text-emerald-400"
            : part.removed
              ? "text-rose-700 dark:text-rose-400"
              : "text-muted-foreground";
          const prefix = part.added ? "+ " : part.removed ? "- " : "  ";
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: diff parts are positional
            <span key={i} className={`${bg} ${text}`}>
              {prefix}
              {part.value}
            </span>
          );
        })}
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MovedGroup — children reorder entries
// ---------------------------------------------------------------------------

type MovedGroupProps = {
  moved: import("@/builder/diff/types").ChildrenMoveEntry[];
};

function MovedGroup({ moved }: MovedGroupProps) {
  const [open, setOpen] = useState(moved.length > 0);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-accent/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="size-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-3.5 text-muted-foreground" />
          )}
          <span className="text-sm font-medium">Moved / Reordered</span>
          <span className="rounded-full bg-sky-500/15 px-1.5 py-0.5 text-xs font-medium tabular-nums text-sky-700 dark:text-sky-400">
            {moved.length}
          </span>
        </div>
      </button>

      {open && moved.length > 0 && (
        <ul className="pb-1">
          {moved.map((entry) => (
            <li
              key={entry.parentId}
              className="ml-8 border-l-2 border-l-sky-500/60"
            >
              <div className="px-3 py-1.5 text-xs text-muted-foreground">
                <span className="font-mono">{entry.parentId}</span>
                <span className="ml-2">
                  {entry.before.length} → {entry.after.length} children
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && moved.length === 0 && (
        <p className="px-8 pb-2 text-xs text-muted-foreground">None</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading / error states
// ---------------------------------------------------------------------------

function DiffSkeleton() {
  return (
    <div className="space-y-3 px-4 py-6">
      {Array.from({ length: 4 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows are positional
        <div key={i} className="h-5 animate-pulse rounded bg-muted" />
      ))}
    </div>
  );
}

function DiffError({ message }: { message: string }) {
  return (
    <div className="px-4 py-6 text-sm text-destructive">
      <p className="font-medium">Failed to load diff</p>
      <p className="mt-1 text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fallback empty block (avoids null checks in extractTextForDiff callers)
// ---------------------------------------------------------------------------
const EMPTY_BLOCK: BlockEntity = {
  id: "__empty__",
  parentId: "__empty__",
  kind: "text",
  data: {},
};
