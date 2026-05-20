"use client";

import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  FileImage,
  FileText,
  GitBranch,
  ListTree,
  Monitor,
  Plus,
  Printer,
  Smartphone,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { defaultDataFor, manifestFor } from "@/builder/blocks/registry";
import {
  defaultDocsTreeFor,
  SECTION_INFO,
  type SectionSeedSpec,
} from "@/builder/defaults";
import type {
  BlockEntity,
  ProjectKind,
  ScreenEntity,
  SectionEntity,
  SectionStatus,
} from "@/builder/types/entity";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useBuilderDispatch,
  useBuilderState,
} from "@/hooks/builder/use-builder-store.hook";
import { cn } from "@/lib/utils";
import { useBacklogStore, useBuilderUiStore } from "@/services/stores";
import { ConfirmDestructiveDialog } from "./confirm-destructive-dialog";
import { StatusChipMenu } from "./status-chip";

export function LeftRail() {
  const topMode = useBuilderUiStore((s) => s.topMode);
  const collapsed = useBuilderUiStore((s) => s.leftRailCollapsed);
  const toggle = useBuilderUiStore((s) => s.toggleLeftRail);
  const planKind = useBuilderState(
    (s) => Object.values(s.state.plans)[0]?.kind ?? null,
  );

  if (collapsed) {
    return (
      <aside className="flex h-full flex-col items-center border-r bg-background">
        <Button
          size="icon"
          variant="ghost"
          className="mt-2 size-7"
          onClick={toggle}
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <ChevronsRight className="size-4" />
        </Button>
      </aside>
    );
  }

  return (
    <aside className="flex h-full flex-col border-r">
      {topMode === "backlog" ? (
        <BacklogRail onCollapse={toggle} />
      ) : topMode === "docs" ? (
        <DocsRail onCollapse={toggle} />
      ) : planKind === "web" || planKind === "mobile" ? (
        <ScreensRail kind={planKind} onCollapse={toggle} />
      ) : planKind === "agent" ? (
        <AgentRailPlaceholder onCollapse={toggle} />
      ) : (
        <EmptyRail onCollapse={toggle} />
      )}
    </aside>
  );
}

function RailHeaderActions({
  onAdd,
  addLabel,
  onCollapse,
}: {
  onAdd?: () => void;
  addLabel?: string;
  onCollapse: () => void;
}) {
  return (
    <div className="flex flex-row items-center gap-1">
      {onAdd ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={onAdd}
          aria-label={addLabel}
          title={addLabel}
        >
          <Plus className="size-3.5" />
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-6"
        onClick={onCollapse}
        aria-label="Collapse sidebar"
        title="Collapse sidebar"
      >
        <ChevronsLeft className="size-3.5" />
      </Button>
    </div>
  );
}

function ScreensRail({
  kind,
  onCollapse,
}: {
  kind: ProjectKind;
  onCollapse: () => void;
}) {
  const planId = useBuilderState(
    (s) => Object.values(s.state.plans)[0]?.id ?? null,
  );
  const screensMap = useBuilderState((s) => s.state.screens);
  const currentScreenId = useBuilderState((s) => s.state.currentScreenId);
  // childrenMap: used to compute per-screen block count for conditional confirm
  const childrenMap = useBuilderState((s) => s.state.children);
  const dispatch = useBuilderDispatch();

  const screens = useMemo(() => {
    return Object.values(screensMap).filter((s) => s.planId === planId);
  }, [screensMap, planId]);

  // pendingDeleteScreenId: tracks which screen is awaiting confirm dialog
  const [pendingDeleteScreenId, setPendingDeleteScreenId] = useState<
    string | null
  >(null);

  const addScreen = () => {
    if (!planId) return;
    const screen: ScreenEntity = {
      id: crypto.randomUUID(),
      planId,
      title:
        kind === "web"
          ? `Screen ${screens.length + 1}`
          : `Screen ${screens.length + 1}`,
      status: "pending",
    };
    dispatch({ type: "INSERT_SCREEN", screen });
    dispatch({ type: "SWITCH_SCREEN", screenId: screen.id });
  };

  const deleteScreen = (screenId: string) => {
    const childCount = (childrenMap[screenId] ?? []).length;
    if (childCount >= 1) {
      setPendingDeleteScreenId(screenId);
    } else {
      dispatch({ type: "DELETE_SCREEN", screenId });
    }
  };

  const confirmDeleteScreen = () => {
    if (!pendingDeleteScreenId) return;
    dispatch({ type: "DELETE_SCREEN", screenId: pendingDeleteScreenId });
    setPendingDeleteScreenId(null);
  };

  const selectScreen = (screenId: string) => {
    dispatch({ type: "SWITCH_SCREEN", screenId });
  };

  const changeStatus = (screenId: string, status: SectionStatus) => {
    dispatch({
      type: "UPDATE_SCREEN",
      screenId,
      patch: { status },
    });
  };

  return (
    <>
      <div className="flex items-start justify-between px-3 py-2">
        <div className="flex items-center gap-1.5 pt-1 text-caption font-medium uppercase tracking-eyebrow text-muted-foreground">
          {kind === "mobile" ? (
            <Smartphone className="size-3.5" />
          ) : (
            <Monitor className="size-3.5" />
          )}
          <span>Screens · {kind}</span>
        </div>
        <RailHeaderActions
          onAdd={addScreen}
          addLabel="Add screen"
          onCollapse={onCollapse}
        />
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2 text-sm">
        {screens.length === 0 ? (
          <li className="px-2 py-3 text-xs text-muted-foreground">
            No screens yet. Click + to add one.
          </li>
        ) : null}
        {screens.map((screen) => {
          const active = screen.id === currentScreenId;
          return (
            <li key={screen.id}>
              <div
                className={cn(
                  "group flex items-center gap-2 rounded-md px-2 py-1.5",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50",
                )}
              >
                <button
                  type="button"
                  className="flex-1 truncate text-left"
                  onClick={() => selectScreen(screen.id)}
                >
                  {screen.title}
                </button>
                <StatusChipMenu
                  status={screen.status}
                  onChange={(next) => changeStatus(screen.id, next)}
                />
                <button
                  type="button"
                  className="size-6 shrink-0 rounded-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:text-destructive flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteScreen(screen.id);
                  }}
                  aria-label={`Delete ${screen.title}`}
                  title="Delete screen"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {pendingDeleteScreenId !== null ? (
        <ConfirmDestructiveDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) setPendingDeleteScreenId(null);
          }}
          title="스크린 삭제"
          description={`이 스크린과 자식 블록 ${(childrenMap[pendingDeleteScreenId] ?? []).length}개를 함께 삭제합니다. 되돌릴 수 없습니다.`}
          onConfirm={confirmDeleteScreen}
        />
      ) : null}
    </>
  );
}

function DocsRail({ onCollapse }: { onCollapse: () => void }) {
  const docsRootsRaw = useBuilderState((s) => s.state.docsRootIds);
  const sections = useBuilderState((s) => s.state.sections);
  const docsRoots = useMemo(
    () => docsRootsRaw.filter((id) => sections[id]?.kind !== "backlog"),
    [docsRootsRaw, sections],
  );
  const childrenMap = useBuilderState((s) => s.state.children);
  const planId = useBuilderState(
    (s) => Object.values(s.state.plans)[0]?.id ?? null,
  );
  const planKind = useBuilderState(
    (s) => Object.values(s.state.plans)[0]?.kind ?? null,
  );
  const dispatch = useBuilderDispatch();
  const currentSectionId = useBuilderUiStore((s) => s.currentSectionId);
  const setCurrentSectionId = useBuilderUiStore((s) => s.setCurrentSectionId);

  const templates = useMemo<SectionSeedSpec[]>(
    () => (planKind ? defaultDocsTreeFor(planKind) : []),
    [planKind],
  );

  const subSectionsOf = (parentId: string): SectionEntity[] => {
    const ids = childrenMap[parentId] ?? [];
    const out: SectionEntity[] = [];
    for (const id of ids) {
      const sec = sections[id];
      if (sec) out.push(sec);
    }
    return out;
  };

  const handleAddRoot = () => {
    if (!planId) return;
    const section: SectionEntity = {
      id: crypto.randomUUID(),
      planId,
      parentId: null,
      kind: "overview",
      title: `Section ${docsRoots.length + 1}`,
      status: "pending",
    };
    dispatch({ type: "INSERT_SECTION", section });
    setCurrentSectionId(section.id);
  };

  /**
   * Inserts a template section. If the spec carries children (e.g. Policy),
   * the parent goes in first, then each child as a sub-section. If
   * SECTION_INFO[kind].starter is defined, those starter blocks are also
   * dispatched as INSERT_BLOCK under the parent so the user lands on a
   * pre-scaffolded section rather than an empty canvas.
   *
   * The first inserted section becomes the active selection.
   */
  const handleAddTemplate = (spec: SectionSeedSpec) => {
    if (!planId) return;
    const parent: SectionEntity = {
      id: crypto.randomUUID(),
      planId,
      parentId: null,
      kind: spec.kind,
      title: spec.title,
      status: "pending",
    };
    dispatch({ type: "INSERT_SECTION", section: parent });
    setCurrentSectionId(parent.id);
    if (spec.children) {
      for (const child of spec.children) {
        const sub: SectionEntity = {
          id: crypto.randomUUID(),
          planId,
          parentId: parent.id,
          kind: child.kind,
          title: child.title,
          status: "pending",
        };
        dispatch({ type: "INSERT_SECTION", section: sub });
      }
    }
    const starter = SECTION_INFO[spec.kind]?.starter;
    if (starter) {
      starter.forEach((s, idx) => {
        const manifest = manifestFor(s.kind);
        const block: BlockEntity = {
          id: crypto.randomUUID(),
          parentId: parent.id,
          kind: s.kind,
          context: manifest.context,
          data: { ...defaultDataFor(s.kind), ...(s.data ?? {}) },
        };
        dispatch({
          type: "INSERT_BLOCK",
          parentId: parent.id,
          block,
          index: idx,
        });
      });
    }
  };

  const handleAddChild = (parent: SectionEntity) => {
    if (!planId) return;
    const section: SectionEntity = {
      id: crypto.randomUUID(),
      planId,
      parentId: parent.id,
      kind: parent.kind,
      title: "Subsection",
      status: "pending",
    };
    dispatch({ type: "INSERT_SECTION", section });
    setCurrentSectionId(section.id);
  };

  const handleDelete = (sectionId: string) => {
    dispatch({ type: "DELETE_SECTION", sectionId });
    if (currentSectionId === sectionId) setCurrentSectionId(null);
  };

  const handleStatusChange = (sectionId: string, status: SectionStatus) => {
    dispatch({
      type: "UPDATE_SECTION",
      sectionId,
      patch: { status },
    });
  };

  return (
    <>
      <div className="flex items-start justify-between px-3 py-2">
        <div className="flex items-center gap-1.5 pt-1 text-caption font-medium uppercase tracking-eyebrow text-muted-foreground">
          <BookOpen className="size-3.5" />
          <span>Docs sections</span>
        </div>
        <div className="flex flex-row items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  aria-label="Add section"
                  title="Add section"
                >
                  <Plus className="size-3.5" />
                </Button>
              }
            />
            <DropdownMenuContent className="w-80" align="end">
              {templates.length > 0 ? (
                <>
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-caption font-medium uppercase tracking-eyebrow text-muted-foreground">
                      {planKind === "agent"
                        ? "Agent docs"
                        : planKind === "mobile"
                          ? "Mobile docs"
                          : "Web docs"}
                    </DropdownMenuLabel>
                    {templates.map((spec) => {
                      const info = SECTION_INFO[spec.kind];
                      return (
                        <DropdownMenuItem
                          key={spec.kind}
                          onClick={() => handleAddTemplate(spec)}
                          title={spec.description}
                          className="items-start py-1.5"
                        >
                          <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{spec.title}</span>
                              {info?.titleKo ? (
                                <span className="text-caption text-muted-foreground/80">
                                  {info.titleKo}
                                </span>
                              ) : null}
                              {spec.children?.length ? (
                                <span className="ml-auto rounded bg-muted px-1 py-0.5 text-caption font-mono text-muted-foreground">
                                  +{spec.children.length}
                                </span>
                              ) : null}
                            </div>
                            {spec.description ? (
                              <span className="line-clamp-2 text-caption leading-snug text-muted-foreground">
                                {spec.description}
                              </span>
                            ) : null}
                          </div>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                </>
              ) : null}
              <DropdownMenuItem
                onClick={handleAddRoot}
                title="Add a section without a template."
                className="items-start py-1.5"
              >
                <div className="flex flex-1 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Empty section</span>
                  </div>
                  <span className="text-caption leading-snug text-muted-foreground">
                    Add a section without a template.
                  </span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={onCollapse}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <ChevronsLeft className="size-3.5" />
          </Button>
        </div>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2 text-sm">
        {docsRoots.length === 0 ? (
          <li className="px-2 py-3 text-xs text-muted-foreground">
            No sections. Click + to add one.
          </li>
        ) : null}
        {docsRoots.map((id) => {
          const section = sections[id];
          if (!section) return null;
          return (
            <SectionTreeNode
              key={id}
              section={section}
              depth={0}
              activeId={currentSectionId}
              planId={planId}
              subSectionsOf={subSectionsOf}
              onSelect={(sectionId) => {
                // navigation(currentSectionId)과 selection(InspectPane) 동시 갱신.
                setCurrentSectionId(sectionId);
                dispatch({ type: "SELECT_NODE", nodeId: sectionId });
              }}
              onAddChild={handleAddChild}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          );
        })}
      </ul>
    </>
  );
}

function SectionTreeNode({
  section,
  depth,
  activeId,
  planId,
  subSectionsOf,
  onSelect,
  onAddChild,
  onDelete,
  onStatusChange,
}: {
  section: SectionEntity;
  depth: number;
  activeId: string | null;
  planId: string | null;
  subSectionsOf: (id: string) => SectionEntity[];
  onSelect: (id: string) => void;
  onAddChild: (parent: SectionEntity) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: SectionStatus) => void;
}) {
  const children = subSectionsOf(section.id);
  const hasChildren = children.length > 0;
  const [open, setOpen] = useState(true);
  const active = section.id === activeId;

  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md px-1 py-1",
          active ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
        )}
        style={{ paddingLeft: 4 + depth * 12 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Collapse" : "Expand"}
            className="flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent"
          >
            {open ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
          </button>
        ) : (
          <span className="size-4 shrink-0" />
        )}
        <button
          type="button"
          onClick={() => onSelect(section.id)}
          className="flex-1 truncate text-left"
        >
          {section.title}
        </button>
        <StatusChipMenu
          status={section.status}
          onChange={(next) => onStatusChange(section.id, next)}
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddChild(section);
          }}
          aria-label={`Add child to ${section.title}`}
          title="Add subsection"
          className="size-5 shrink-0 rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:text-foreground flex items-center justify-center"
        >
          <Plus className="size-3" />
        </button>
        {planId ? (
          <SectionExportMenu
            planId={planId}
            sectionId={section.id}
            sectionTitle={section.title}
          />
        ) : null}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(section.id);
          }}
          aria-label={`Delete ${section.title}`}
          title="Delete section"
          className="size-5 shrink-0 rounded-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:text-destructive flex items-center justify-center"
        >
          <Trash2 className="size-3" />
        </button>
      </div>
      {hasChildren && open ? (
        <ul className="space-y-0.5">
          {children.map((child) => (
            <SectionTreeNode
              key={child.id}
              section={child}
              depth={depth + 1}
              activeId={activeId}
              planId={planId}
              subSectionsOf={subSectionsOf}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function SectionExportMenu({
  planId,
  sectionId,
  sectionTitle,
}: {
  planId: string;
  sectionId: string;
  sectionTitle: string;
}) {
  const trigger = (kind: "pdf" | "png") => {
    if (typeof window === "undefined") return;
    const url = `/api/exports/${kind}?planId=${encodeURIComponent(planId)}&sectionId=${encodeURIComponent(sectionId)}`;
    window.open(url, "_blank", "noopener");
  };
  const openPrint = () => {
    window.open(
      `/plan/${encodeURIComponent(planId)}/print?sectionId=${encodeURIComponent(sectionId)}`,
      "_blank",
      "noopener",
    );
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label={`Export ${sectionTitle}`}
            title="Export section"
            onClick={(e) => e.stopPropagation()}
            className="size-5 shrink-0 rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:text-foreground flex items-center justify-center"
          >
            <Download className="size-3" />
          </button>
        }
      />
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => trigger("pdf")}>
          <FileText className="size-3.5" />
          <span>Export as PDF</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => trigger("png")}>
          <FileImage className="size-3.5" />
          <span>Export as PNG</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openPrint}>
          <Printer className="size-3.5" />
          <span>Open print view</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AgentRailPlaceholder({ onCollapse }: { onCollapse: () => void }) {
  const agentTab = useBuilderState((s) => s.state.agentTab);
  const docsRoots = useBuilderState((s) => s.state.docsRootIds);
  const sections = useBuilderState((s) => s.state.sections);
  const dispatch = useBuilderDispatch();
  const currentSectionId = useBuilderUiStore((s) => s.currentSectionId);
  const setCurrentSectionId = useBuilderUiStore((s) => s.setCurrentSectionId);

  return (
    <>
      <div className="flex items-start justify-between px-3 py-2">
        <div className="flex flex-1 items-center gap-1">
          <button
            type="button"
            onClick={() =>
              dispatch({ type: "SWITCH_AGENT_TAB", tab: "scenario" })
            }
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-sm px-2 py-1 text-xs font-medium",
              agentTab === "scenario"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50",
            )}
          >
            <ListTree className="size-3.5" />
            <span>Scenario</span>
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: "SWITCH_AGENT_TAB", tab: "graph" })}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-sm px-2 py-1 text-xs font-medium",
              agentTab === "graph"
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50",
            )}
          >
            <GitBranch className="size-3.5" />
            <span>Graph</span>
          </button>
        </div>
        <RailHeaderActions onCollapse={onCollapse} />
      </div>
      {agentTab === "scenario" ? (
        <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2 text-sm">
          {docsRoots.length === 0 ? (
            <li className="px-2 py-3 text-xs text-muted-foreground">
              No sections.
            </li>
          ) : null}
          {docsRoots.map((id) => {
            const active = id === currentSectionId;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setCurrentSectionId(id)}
                  className={cn(
                    "w-full truncate rounded-md px-2 py-1.5 text-left",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50",
                  )}
                >
                  {sections[id]?.title ?? id}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex-1 px-3 py-2 text-xs text-muted-foreground">
          Add nodes/edges in the canvas. The graph holds the agent's runtime
          shape: input, tool, llm, output and how they wire together.
        </div>
      )}
    </>
  );
}

function BacklogRail({ onCollapse }: { onCollapse: () => void }) {
  const planId = useBuilderState(
    (s) => Object.values(s.state.plans)[0]?.id ?? null,
  );
  const sectionsMap = useBuilderState((s) => s.state.sections);
  const dispatch = useBuilderDispatch();
  const setOpenSheet = useBacklogStore((s) => s.setOpenSheet);
  const registerNew = useBacklogStore((s) => s.registerNew);

  const counts = useMemo(() => {
    const out: Record<SectionStatus, number> = {
      pending: 0,
      "in-progress": 0,
      approved: 0,
      rejected: 0,
    };
    for (const sec of Object.values(sectionsMap)) {
      if (sec.planId !== planId || sec.kind !== "backlog") continue;
      out[sec.status ?? "pending"] += 1;
    }
    return out;
  }, [sectionsMap, planId]);

  const total =
    counts.pending + counts["in-progress"] + counts.approved + counts.rejected;

  return (
    <>
      <div className="flex items-start justify-between px-3 py-2">
        <div className="flex items-center gap-1.5 pt-1 text-caption font-medium uppercase tracking-eyebrow text-muted-foreground">
          <span>Backlog · {total}</span>
        </div>
        <RailHeaderActions
          onAdd={
            planId
              ? () => {
                  const section: SectionEntity = {
                    id: crypto.randomUUID(),
                    planId,
                    parentId: null,
                    kind: "backlog",
                    title: "Untitled",
                    status: "pending",
                  };
                  dispatch({ type: "INSERT_SECTION", section });
                  registerNew(planId, section.id, "pending");
                  setOpenSheet(section.id);
                }
              : undefined
          }
          addLabel="Add backlog"
          onCollapse={onCollapse}
        />
      </div>
      <ul className="flex-1 space-y-1 overflow-y-auto px-3 pb-3 text-xs">
        {(["pending", "in-progress", "approved", "rejected"] as const).map(
          (status) => (
            <li
              key={status}
              className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent/50"
            >
              <span className="capitalize text-muted-foreground">
                {status.replace("-", " ")}
              </span>
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono">
                {counts[status]}
              </span>
            </li>
          ),
        )}
      </ul>
    </>
  );
}

function EmptyRail({ onCollapse }: { onCollapse: () => void }) {
  return (
    <>
      <div className="flex items-start justify-end px-3 py-2">
        <RailHeaderActions onCollapse={onCollapse} />
      </div>
      <div className="p-4 text-xs text-muted-foreground">No plan loaded.</div>
    </>
  );
}
