"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import {
  SECTION_STATUS_VALUES,
  type SectionEntity,
  type SectionStatus,
} from "@/builder/types/entity";
import { Button } from "@/components/ui/button";
import {
  useBuilderDispatch,
  useBuilderState,
} from "@/hooks/builder/use-builder-store.hook";
import { cn } from "@/lib/utils";
import { useBacklogStore } from "@/services/stores";
import { BacklogSheet } from "./backlog-sheet";

const COLUMN_LABEL: Record<SectionStatus, string> = {
  pending: "Pending",
  "in-progress": "In progress",
  approved: "Approved",
  rejected: "Rejected",
};

const COLUMN_ACCENT: Record<SectionStatus, string> = {
  pending: "border-muted-foreground/30",
  "in-progress": "border-amber-500/60",
  approved: "border-emerald-500/60",
  rejected: "border-rose-500/60",
};

const statusOf = (s: SectionEntity | undefined): SectionStatus =>
  s?.status ?? "pending";

export function BacklogBoard() {
  const planId = useBuilderState(
    (s) => Object.values(s.state.plans)[0]?.id ?? null,
  );
  const sectionsMap = useBuilderState((s) => s.state.sections);
  const dispatch = useBuilderDispatch();
  const draggingId = useBacklogStore((s) => s.draggingId);
  const setOpenSheet = useBacklogStore((s) => s.setOpenSheet);
  const orderedFor = useBacklogStore((s) => s.orderedFor);
  const registerNew = useBacklogStore((s) => s.registerNew);

  const backlogSections = useMemo(
    () =>
      Object.values(sectionsMap).filter(
        (sec) => sec.planId === planId && sec.kind === "backlog",
      ),
    [sectionsMap, planId],
  );

  const grouped = useMemo(() => {
    if (!planId)
      return {
        pending: [],
        "in-progress": [],
        approved: [],
        rejected: [],
      } as Record<SectionStatus, string[]>;
    return orderedFor(
      planId,
      (id) => statusOf(sectionsMap[id]),
      backlogSections.map((s) => s.id),
    );
  }, [planId, orderedFor, sectionsMap, backlogSections]);

  if (!planId) {
    return (
      <main className="h-full overflow-auto p-6 text-sm text-muted-foreground">
        No plan loaded.
      </main>
    );
  }

  const handleAdd = (status: SectionStatus) => {
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
        {SECTION_STATUS_VALUES.map((status) => (
          <Column
            key={status}
            status={status}
            sectionIds={grouped[status]}
            sectionsMap={sectionsMap}
            planId={planId}
            dragActive={draggingId !== null}
            onAdd={() => handleAdd(status)}
          />
        ))}
      </div>

      <BacklogSheet />
    </main>
  );
}

function Column({
  status,
  sectionIds,
  sectionsMap,
  planId,
  dragActive,
  onAdd,
}: {
  status: SectionStatus;
  sectionIds: string[];
  sectionsMap: Record<string, SectionEntity>;
  planId: string;
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
    const cur = sectionsMap[id];
    if (!cur) return;
    const fromStatus = statusOf(cur);
    if (fromStatus !== status) {
      dispatch({
        type: "UPDATE_SECTION",
        sectionId: id,
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
            {sectionIds.length}
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
          dragActive
            ? (e) => handleDropAtIndex(e, sectionIds.length)
            : undefined
        }
      >
        {sectionIds.map((id, idx) => {
          const sec = sectionsMap[id];
          if (!sec) return null;
          return (
            <div key={id}>
              <DropZone
                active={dragActive}
                hover={overIdx === idx}
                onEnter={() => setOverIdx(idx)}
                onLeave={() => setOverIdx((cur) => (cur === idx ? null : cur))}
                onDrop={(e) => handleDropAtIndex(e, idx)}
              />
              <BacklogCard section={sec} />
            </div>
          );
        })}
        <DropZone
          active={dragActive}
          hover={overIdx === sectionIds.length}
          onEnter={() => setOverIdx(sectionIds.length)}
          onLeave={() =>
            setOverIdx((cur) => (cur === sectionIds.length ? null : cur))
          }
          onDrop={(e) => handleDropAtIndex(e, sectionIds.length)}
        />
        {sectionIds.length === 0 && !dragActive ? (
          <div className="rounded-md border border-dashed py-6 text-center text-[11px] text-muted-foreground">
            empty
          </div>
        ) : null}
        {sectionIds.length === 0 && dragActive ? (
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

function BacklogCard({ section }: { section: SectionEntity }) {
  const beginDrag = useBacklogStore((s) => s.beginDrag);
  const endDrag = useBacklogStore((s) => s.endDrag);
  const setOpenSheet = useBacklogStore((s) => s.setOpenSheet);
  const isDragging = useBacklogStore((s) => s.draggingId === section.id);
  const childCount = useBuilderState(
    (s) => s.state.children[section.id]?.length ?? 0,
  );

  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("application/x-backlog-id", section.id);
        beginDrag(section.id);
      }}
      onDragEnd={() => endDrag()}
      onDoubleClick={() => setOpenSheet(section.id)}
      className={cn(
        "block w-full cursor-grab rounded-md border bg-amber-50 px-3 py-2 text-left shadow-sm",
        "transition-transform hover:-rotate-[0.3deg] hover:shadow",
        "dark:bg-amber-950/40 dark:text-amber-50",
        "active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <div className="truncate text-sm font-medium">
        {section.title || "Untitled"}
      </div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">
        {childCount > 0 ? `${childCount} blocks` : "더블클릭해서 작성"}
      </div>
    </button>
  );
}
