"use client";

import { Box, Cpu, FileText, Monitor, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import {
  listTrackedEntities,
  type TrackedEntity,
  type TrackedEntityKind,
} from "@/builder/selectors/tracked-entities";
import {
  ENTITY_STATUS_VALUES,
  type EntityStatus,
  type SectionEntity,
} from "@/builder/types/entity";
import { Button } from "@/components/ui/button";
import {
  useBuilderDispatch,
  useBuilderState,
} from "@/hooks/builder/use-builder-store.hook";
import { cn } from "@/lib/utils";
import { useBacklogStore } from "@/services/stores";
import { BacklogSheet } from "./backlog-sheet";

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

const COLUMN_LABEL: Record<EntityStatus, string> = {
  pending: "Pending",
  "in-progress": "In progress",
  approved: "Approved",
  rejected: "Rejected",
};

const COLUMN_ACCENT: Record<EntityStatus, string> = {
  pending: "border-muted-foreground/30",
  "in-progress": "border-amber-500/60",
  approved: "border-emerald-500/60",
  rejected: "border-rose-500/60",
};

function KindIcon({ kind }: { kind: TrackedEntityKind }) {
  const cls = "size-3 shrink-0 text-muted-foreground";
  switch (kind) {
    case "section":
      return <FileText className={cls} />;
    case "block":
      return <Box className={cls} />;
    case "screen":
      return <Monitor className={cls} />;
    case "agent-node":
      return <Cpu className={cls} />;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// BacklogBoard
// ──────────────────────────────────────────────────────────────────────────────

export function BacklogBoard() {
  // planId: primitive → useBuilderState (stable unless plan changes).
  const planId = useBuilderState(
    (s) => Object.values(s.state.plans)[0]?.id ?? null,
  );
  // sectionsMap: passed to Column for legacy-backlog "Add" flow.
  const sectionsMap = useBuilderState((s) => s.state.sections);

  const dispatch = useBuilderDispatch();
  const draggingId = useBacklogStore((s) => s.draggingId);
  const setOpenSheet = useBacklogStore((s) => s.setOpenSheet);
  const orderedFor = useBacklogStore((s) => s.orderedFor);
  const registerNew = useBacklogStore((s) => s.registerNew);

  // Full AppState snapshot — listTrackedEntities is a pure function; calling
  // it directly avoids allocating an array inside getSnapshot (which would
  // trigger the "infinite loop" warning). Instead we receive the raw state
  // and run the selector in useMemo.
  const builderState = useBuilderState((s) => s.state);

  const trackedEntities = useMemo(
    () => listTrackedEntities(builderState),
    [builderState],
  );

  const grouped = useMemo(() => {
    if (!planId) {
      return {
        pending: [] as TrackedEntity[],
        "in-progress": [] as TrackedEntity[],
        approved: [] as TrackedEntity[],
        rejected: [] as TrackedEntity[],
      };
    }

    const out: Record<EntityStatus, TrackedEntity[]> = {
      pending: [],
      "in-progress": [],
      approved: [],
      rejected: [],
    };
    for (const t of trackedEntities) {
      out[t.status].push(t);
    }

    // Respect persisted column order from backlog store.
    const ids = trackedEntities.map((t) => t.id);
    const orderedIds = orderedFor(
      planId,
      (id) => trackedEntities.find((t) => t.id === id)?.status ?? "pending",
      ids,
    );

    // Rebuild grouped using the ordered id sequence.
    const entityMap = new Map(trackedEntities.map((t) => [t.id, t]));
    const ordered: Record<EntityStatus, TrackedEntity[]> = {
      pending: [],
      "in-progress": [],
      approved: [],
      rejected: [],
    };
    for (const status of ENTITY_STATUS_VALUES) {
      for (const id of orderedIds[status] ?? []) {
        const e = entityMap.get(id);
        if (e) ordered[status].push(e);
      }
    }
    return ordered;
  }, [planId, trackedEntities, orderedFor]);

  if (!planId) {
    return (
      <main className="h-full overflow-auto p-6 text-sm text-muted-foreground">
        No plan loaded.
      </main>
    );
  }

  const handleAdd = (status: EntityStatus) => {
    const section: SectionEntity = {
      id: crypto.randomUUID(),
      planId,
      parentId: null,
      kind: "backlog",
      title: "Untitled",
      status,
    };
    dispatch({ type: "INSERT_SECTION", section });
    registerNew(planId, section.id, status);
    setOpenSheet(section.id);
  };

  return (
    <main className="flex h-full flex-col overflow-hidden p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Backlog</h2>
          <p className="text-xs text-muted-foreground">
            카드를 드래그해서 상태를 옮기고, 더블클릭하면 노션식 페이지가
            열립니다.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleAdd("pending")}
        >
          <Plus className="size-3.5" />
          <span>New backlog</span>
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-4 gap-3">
        {ENTITY_STATUS_VALUES.map((status) => (
          <Column
            key={status}
            status={status}
            entities={grouped[status]}
            planId={planId}
            sectionsMap={sectionsMap}
            dragActive={draggingId !== null}
            onAdd={() => handleAdd(status)}
          />
        ))}
      </div>

      <BacklogSheet />
    </main>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Column
// ──────────────────────────────────────────────────────────────────────────────

function Column({
  status,
  entities,
  planId,
  sectionsMap,
  dragActive,
  onAdd,
}: {
  status: EntityStatus;
  entities: TrackedEntity[];
  planId: string;
  sectionsMap: Record<string, SectionEntity>;
  dragActive: boolean;
  onAdd: () => void;
}) {
  const dispatch = useBuilderDispatch();
  const reorder = useBacklogStore((s) => s.reorder);
  const endDrag = useBacklogStore((s) => s.endDrag);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [columnHover, setColumnHover] = useState(false);

  const handleDropAtIndex = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    const id = e.dataTransfer.getData("application/x-backlog-id");
    setOverIdx(null);
    setColumnHover(false);
    endDrag();
    if (!id) return;

    // Determine the entity's current status by searching all tracked entities.
    // We use entities in scope only for the target column; we need to know
    // the *source* status so we get it from the AppState snapshot via a
    // separate selector read. Since Column is a child of BacklogBoard which
    // re-renders on state change, `entities` is always fresh — we search the
    // dragged id across all columns via the backlog store's orderedFor:
    // it's simpler to just dispatch and let the reorder store handle cross-
    // column movement.

    // Find current status from the dragged entity. We walk the sectionsMap
    // for sections; for other kinds we rely on entityMeta (already reflected
    // in the TrackedEntity list passed from BacklogBoard).
    // The reorder call needs fromStatus — approximate it as the column the
    // drag started from. If the card came from a different column the reorder
    // store will reconcile.
    const fromStatus: EntityStatus = (() => {
      // The drag source entity may be in any column. Use sectionsMap for legacy
      // backlog sections; for others the entityMeta status was embedded in
      // TrackedEntity. We don't have cross-column entity list here, so we read
      // from the dispatch (store will correct on next render cycle).
      const sec = sectionsMap[id];
      if (sec?.status) return sec.status;
      // Default: treat as same column (reorder handles no-op gracefully).
      return status;
    })();

    if (fromStatus !== status) {
      dispatch({
        type: "UPDATE_ENTITY_META",
        entityId: id,
        patch: { status },
      });
    }
    reorder(planId, id, fromStatus, status, idx);
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: kanban column drop target.
    <section
      className={cn(
        "flex h-full min-h-0 flex-col rounded-md border-2 bg-muted/30 transition-colors",
        COLUMN_ACCENT[status],
        dragActive && "border-dashed",
        columnHover && "ring-2 ring-primary/60 bg-primary/5",
      )}
      onDragEnter={dragActive ? () => setColumnHover(true) : undefined}
      onDragLeave={
        dragActive
          ? (e) => {
              if (
                e.currentTarget instanceof Node &&
                e.relatedTarget instanceof Node &&
                e.currentTarget.contains(e.relatedTarget)
              ) {
                return;
              }
              setColumnHover(false);
            }
          : undefined
      }
    >
      <header className="flex items-center justify-between border-b bg-background/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide">
            {COLUMN_LABEL[status]}
          </span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {entities.length}
          </span>
        </div>
        <button
          type="button"
          aria-label={`Add ${COLUMN_LABEL[status]}`}
          title="Add card"
          className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={onAdd}
        >
          <Plus className="size-3.5" />
        </button>
      </header>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: kanban column drop target. */}
      <div
        className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2"
        onDragOver={
          dragActive
            ? (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }
            : undefined
        }
        onDrop={
          dragActive ? (e) => handleDropAtIndex(e, entities.length) : undefined
        }
      >
        {entities.map((entity, idx) => (
          <div key={entity.id}>
            <DropZone
              active={dragActive}
              hover={overIdx === idx}
              onEnter={() => setOverIdx(idx)}
              onLeave={() => setOverIdx((cur) => (cur === idx ? null : cur))}
              onDrop={(e) => handleDropAtIndex(e, idx)}
            />
            <TrackedCard entity={entity} />
          </div>
        ))}
        <DropZone
          active={dragActive}
          hover={overIdx === entities.length}
          onEnter={() => setOverIdx(entities.length)}
          onLeave={() =>
            setOverIdx((cur) => (cur === entities.length ? null : cur))
          }
          onDrop={(e) => handleDropAtIndex(e, entities.length)}
        />
        {entities.length === 0 && !dragActive ? (
          <div className="rounded-md border border-dashed py-6 text-center text-[11px] text-muted-foreground">
            empty
          </div>
        ) : null}
        {entities.length === 0 && dragActive ? (
          <div
            className={cn(
              "rounded-md border-2 border-dashed py-6 text-center text-[11px] transition-colors",
              columnHover
                ? "border-primary bg-primary/10 text-primary"
                : "border-muted-foreground/30 text-muted-foreground",
            )}
          >
            여기에 놓기
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// DropZone
// ──────────────────────────────────────────────────────────────────────────────

function DropZone({
  active,
  hover,
  onEnter,
  onLeave,
  onDrop,
}: {
  active: boolean;
  hover: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  if (!active) return null;
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: drop indicator only.
    <div
      className={cn(
        "relative my-1 transition-[height,background-color] duration-150",
        hover ? "h-3" : "h-2",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        onEnter();
      }}
      onDragLeave={onLeave}
      onDrop={onDrop}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-1 top-1/2 -translate-y-1/2 rounded-full transition-colors",
          hover
            ? "h-1.5 bg-primary shadow-[0_0_0_3px] shadow-primary/30"
            : "h-0.5 bg-muted-foreground/25",
        )}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// TrackedCard — entity kind별 prefix 아이콘 + title + path
// ──────────────────────────────────────────────────────────────────────────────

function TrackedCard({ entity }: { entity: TrackedEntity }) {
  const beginDrag = useBacklogStore((s) => s.beginDrag);
  const endDrag = useBacklogStore((s) => s.endDrag);
  const setOpenSheet = useBacklogStore((s) => s.setOpenSheet);
  const isDragging = useBacklogStore((s) => s.draggingId === entity.id);

  const handleDoubleClick = () => {
    // v1: sheet는 section 전용. 다른 kind는 noop.
    if (entity.kind === "section") {
      setOpenSheet(entity.id);
    }
  };

  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("application/x-backlog-id", entity.id);
        beginDrag(entity.id);
      }}
      onDragEnd={() => endDrag()}
      onDoubleClick={handleDoubleClick}
      className={cn(
        "block w-full cursor-grab rounded-md border bg-amber-50 px-3 py-2 text-left shadow-sm",
        "transition-transform hover:-rotate-[0.3deg] hover:shadow",
        "dark:bg-amber-950/40 dark:text-amber-50",
        "active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <div className="flex items-center gap-1.5 truncate">
        <KindIcon kind={entity.kind} />
        <span className="truncate text-sm font-medium">
          {entity.title || "Untitled"}
        </span>
      </div>
      {entity.path ? (
        <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
          {entity.path}
        </div>
      ) : null}
    </button>
  );
}
