"use client";

import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type {
  ProjectKind,
  ScreenEntity,
  SectionEntity,
} from "@/builder/types/entity";
import { Button } from "@/components/ui/button";
import {
  useBuilderDispatch,
  useBuilderState,
} from "@/hooks/builder/use-builder-store.hook";
import { cn } from "@/lib/utils";
import { useBuilderUiStore } from "@/services/stores";

export function LeftRail() {
  const topMode = useBuilderUiStore((s) => s.topMode);
  const planKind = useBuilderState(
    (s) => Object.values(s.state.plans)[0]?.kind ?? null,
  );

  if (topMode === "docs") {
    return (
      <aside className="flex h-full flex-col border-r">
        <DocsRail />
      </aside>
    );
  }

  return (
    <aside className="flex h-full flex-col border-r">
      {planKind === "web" || planKind === "mobile" ? (
        <ScreensRail kind={planKind} />
      ) : planKind === "agent" ? (
        <AgentRailPlaceholder />
      ) : (
        <EmptyRail />
      )}
    </aside>
  );
}

function ScreensRail({ kind }: { kind: ProjectKind }) {
  const planId = useBuilderState(
    (s) => Object.values(s.state.plans)[0]?.id ?? null,
  );
  const screensMap = useBuilderState((s) => s.state.screens);
  const currentScreenId = useBuilderState((s) => s.state.currentScreenId);
  const dispatch = useBuilderDispatch();

  const screens = useMemo(() => {
    return Object.values(screensMap).filter((s) => s.planId === planId);
  }, [screensMap, planId]);

  const addScreen = () => {
    if (!planId) return;
    const screen: ScreenEntity = {
      id: crypto.randomUUID(),
      planId,
      title:
        kind === "web"
          ? `Screen ${screens.length + 1}`
          : `Screen ${screens.length + 1}`,
    };
    dispatch({ type: "INSERT_SCREEN", screen });
    dispatch({ type: "SWITCH_SCREEN", screenId: screen.id });
  };

  const deleteScreen = (screenId: string) => {
    dispatch({ type: "DELETE_SCREEN", screenId });
  };

  const selectScreen = (screenId: string) => {
    dispatch({ type: "SWITCH_SCREEN", screenId });
  };

  return (
    <>
      <div className="flex items-center justify-between px-3 py-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Screens · {kind}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={addScreen}
          aria-label="Add screen"
          title="Add screen"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2 text-sm">
        {screens.length === 0 ? (
          <li className="px-2 py-3 text-xs text-muted-foreground">
            No screens yet — click + to add one.
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
                <button
                  type="button"
                  className="size-6 shrink-0 rounded text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 flex items-center justify-center"
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
    </>
  );
}

function DocsRail() {
  const docsRoots = useBuilderState((s) => s.state.docsRootIds);
  const sections = useBuilderState((s) => s.state.sections);
  const childrenMap = useBuilderState((s) => s.state.children);
  const planId = useBuilderState(
    (s) => Object.values(s.state.plans)[0]?.id ?? null,
  );
  const dispatch = useBuilderDispatch();
  const currentSectionId = useBuilderUiStore((s) => s.currentSectionId);
  const setCurrentSectionId = useBuilderUiStore((s) => s.setCurrentSectionId);

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
    };
    dispatch({ type: "INSERT_SECTION", section });
    setCurrentSectionId(section.id);
  };

  const handleAddChild = (parent: SectionEntity) => {
    if (!planId) return;
    const section: SectionEntity = {
      id: crypto.randomUUID(),
      planId,
      parentId: parent.id,
      kind: parent.kind,
      title: "Subsection",
    };
    dispatch({ type: "INSERT_SECTION", section });
    setCurrentSectionId(section.id);
  };

  const handleDelete = (sectionId: string) => {
    dispatch({ type: "DELETE_SECTION", sectionId });
    if (currentSectionId === sectionId) setCurrentSectionId(null);
  };

  return (
    <>
      <div className="flex items-center justify-between px-3 py-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Docs sections
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={handleAddRoot}
          aria-label="Add section"
          title="Add section"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2 text-sm">
        {docsRoots.length === 0 ? (
          <li className="px-2 py-3 text-xs text-muted-foreground">
            No sections — click + to add one.
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
              subSectionsOf={subSectionsOf}
              onSelect={setCurrentSectionId}
              onAddChild={handleAddChild}
              onDelete={handleDelete}
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
  subSectionsOf,
  onSelect,
  onAddChild,
  onDelete,
}: {
  section: SectionEntity;
  depth: number;
  activeId: string | null;
  subSectionsOf: (id: string) => SectionEntity[];
  onSelect: (id: string) => void;
  onAddChild: (parent: SectionEntity) => void;
  onDelete: (id: string) => void;
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
            className="flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent"
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
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAddChild(section);
          }}
          aria-label={`Add child to ${section.title}`}
          title="Add subsection"
          className="size-5 shrink-0 rounded text-muted-foreground opacity-0 hover:bg-accent group-hover:opacity-100 flex items-center justify-center"
        >
          <Plus className="size-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(section.id);
          }}
          aria-label={`Delete ${section.title}`}
          title="Delete section"
          className="size-5 shrink-0 rounded text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 flex items-center justify-center"
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
              subSectionsOf={subSectionsOf}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onDelete={onDelete}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function AgentRailPlaceholder() {
  const agentTab = useBuilderState((s) => s.state.agentTab);
  const docsRoots = useBuilderState((s) => s.state.docsRootIds);
  const sections = useBuilderState((s) => s.state.sections);
  const dispatch = useBuilderDispatch();
  const currentSectionId = useBuilderUiStore((s) => s.currentSectionId);
  const setCurrentSectionId = useBuilderUiStore((s) => s.setCurrentSectionId);

  return (
    <>
      <div className="flex items-center gap-1 px-3 py-2">
        <button
          type="button"
          onClick={() =>
            dispatch({ type: "SWITCH_AGENT_TAB", tab: "scenario" })
          }
          className={cn(
            "flex-1 rounded px-2 py-1 text-xs font-medium",
            agentTab === "scenario"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50",
          )}
        >
          Scenario
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: "SWITCH_AGENT_TAB", tab: "graph" })}
          className={cn(
            "flex-1 rounded px-2 py-1 text-xs font-medium",
            agentTab === "graph"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50",
          )}
        >
          Graph
        </button>
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
          shape — input/tool/llm/output and how they wire together.
        </div>
      )}
    </>
  );
}

function EmptyRail() {
  return (
    <div className="p-4 text-xs text-muted-foreground">No plan loaded.</div>
  );
}
