"use client";

import { AnimatePresence } from "motion/react";
import { type ReactNode, useRef } from "react";
import type { ProjectKind, ScreenEntity } from "@/builder/types/entity";
import { useBuilderShortcuts } from "@/hooks/builder/use-builder-shortcuts.hook";
import {
  useBuilderDispatch,
  useBuilderState,
} from "@/hooks/builder/use-builder-store.hook";
import { useInsertSlot } from "@/hooks/builder/use-insert-slot.hook";
import { useMarquee } from "@/hooks/builder/use-marquee.hook";
import { cn } from "@/lib/utils";
import {
  useBuilderUiStore,
  useChatStore,
  usePanelStore,
} from "@/services/stores";
import { AgentGraph } from "./agent-graph";
import { BacklogBoard } from "./backlog-board";
import { BlockShell } from "./block-shell";
import { BuilderProvider } from "./builder-provider";
import { EmptyStateCards } from "./empty-state-cards";
import { FlowCanvas } from "./flow-canvas";
import { BrowserFrame, MobileFrame } from "./frames";
import { InsertSlot } from "./insert-slot";
import { LeftRail } from "./left-rail";
import { MarqueeOverlay } from "./marquee-overlay";
import { SidePanel } from "./side-panel";
import { TopBar } from "./top-bar";
import { ViewModeOverrideToggle } from "./view-mode-override-toggle";

const EMPTY_IDS: readonly string[] = Object.freeze([]);

export function BuilderPage({ planId }: { planId: string }) {
  return (
    <BuilderProvider planId={planId}>
      <BuilderShell />
    </BuilderProvider>
  );
}

// Static padding values matching the overlay widths so canvas content
// never slides under the rails. Padding is intentionally not transitioned
// (layout property) — it jumps on collapse toggle, which is the expected
// UX for a deliberate user action.
const RAIL_EXPANDED_PX = 260; // --spacing-rail
const RAIL_COLLAPSED_PX = 36; // --spacing-rail-collapsed

function BuilderShell() {
  useBuilderShortcuts();
  const runState = useChatStore((s) => s.runState);
  const aiActive = runState !== "idle";
  const leftCollapsed = useBuilderUiStore((s) => s.leftRailCollapsed);
  const rightWidth = usePanelStore((s) => s.width);
  const leftWidth = leftCollapsed ? RAIL_COLLAPSED_PX : RAIL_EXPANDED_PX;

  return (
    <div data-builder="root" className="grid h-screen grid-rows-[auto_1fr]">
      <TopBar />
      {/* Canvas area: single full-width container; rails float above as overlays */}
      <div className="relative overflow-hidden">
        {/* LeftRail overlay: always visible, width shrinks on collapse */}
        <aside
          aria-label="Builder navigation"
          className="absolute inset-y-0 left-0 z-30"
          style={{ width: leftWidth }}
        >
          <LeftRail />
        </aside>

        {/* Canvas: full width, static padding reserves space under each overlay */}
        <div
          data-ai-active={aiActive ? "true" : undefined}
          data-ai-state={runState}
          className={cn(
            "canvas-shell h-full min-h-0 overflow-hidden",
            aiActive && "ai-active",
          )}
          style={{ paddingLeft: RAIL_EXPANDED_PX, paddingRight: rightWidth }}
        >
          <Canvas />
        </div>

        {/* SidePanel overlay: hidden on small screens (lg:flex inside SidePanel) */}
        <div
          className="absolute inset-y-0 right-0 z-30"
          style={{ width: rightWidth }}
        >
          <SidePanel />
        </div>
      </div>
    </div>
  );
}

function Canvas() {
  const planKind = useBuilderState(
    (s) => Object.values(s.state.plans)[0]?.kind ?? null,
  );
  const canvasMode = useBuilderUiStore((s) => s.canvasMode);
  const topMode = useBuilderUiStore((s) => s.topMode);
  const agentTab = useBuilderState((s) => s.state.agentTab);

  if (topMode === "backlog") {
    return <BacklogBoard />;
  }

  if (topMode === "docs") {
    return <SectionCanvas />;
  }

  if (planKind === "agent") {
    if (agentTab === "graph") return <AgentGraph />;
    return <SectionCanvas />;
  }

  if (canvasMode === "flow" && (planKind === "web" || planKind === "mobile")) {
    return <FlowCanvas kind={planKind} />;
  }

  return <ScreenCanvas planKind={planKind} />;
}

function ScreenCanvas({ planKind }: { planKind: ProjectKind | null }) {
  const screenId = useBuilderState((s) => s.state.currentScreenId);
  const screen = useBuilderState((s) =>
    screenId ? s.state.screens[screenId] : undefined,
  );
  const childIds = useBuilderState((s) =>
    screenId ? (s.state.children[screenId] ?? EMPTY_IDS) : EMPTY_IDS,
  );
  const viewMode = useBuilderState((s) => s.state.viewMode);
  const dispatch = useBuilderDispatch();
  const rootRef = useRef<HTMLElement | null>(null);
  const marquee = useMarquee(rootRef, dispatch);
  const insertFirst = useInsertSlot(screen?.id ?? "");

  if (!screen) {
    return (
      <main className="h-full overflow-auto p-6 text-sm text-muted-foreground">
        No screen selected — open a Web/Mobile demo to see the builder canvas.
      </main>
    );
  }

  if (childIds.length === 0) {
    return (
      <main className="h-full overflow-auto">
        <div className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="font-medium">{screen.title}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                (0 blocks · {viewMode})
              </span>
            </div>
            <ViewModeOverrideToggle entityId={screen.id} />
          </div>
        </div>
        <EmptyStateCards
          context="app"
          onPick={(kind) => insertFirst(kind, 0)}
        />
      </main>
    );
  }

  const blockTree = (
    <>
      <AnimatePresence initial={false}>
        {childIds.map((id, idx) => (
          <div key={id}>
            <InsertSlot parentId={screen.id} index={idx} />
            <BlockShell blockId={id} />
          </div>
        ))}
      </AnimatePresence>
      <InsertSlot
        parentId={screen.id}
        index={childIds.length}
        variant="trailing"
      />
    </>
  );

  return (
    <main
      ref={rootRef}
      className="h-full overflow-auto p-6"
      onPointerDown={marquee.handlers.onPointerDown}
      onPointerMove={marquee.handlers.onPointerMove}
      onPointerUp={marquee.handlers.onPointerUp}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm">
          <span className="font-medium">{screen.title}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            ({childIds.length} blocks · {viewMode})
          </span>
        </div>
        <ViewModeOverrideToggle entityId={screen.id} />
      </div>
      <ScreenFrame kind={planKind} screen={screen}>
        {blockTree}
      </ScreenFrame>
      <MarqueeOverlay box={marquee.box} />
    </main>
  );
}

function SectionCanvas() {
  const sectionId = useBuilderUiStore((s) => s.currentSectionId);
  const section = useBuilderState((s) =>
    sectionId ? s.state.sections[sectionId] : undefined,
  );
  const blocks = useBuilderState((s) => s.state.blocks);
  const allChildIds = useBuilderState((s) =>
    sectionId ? (s.state.children[sectionId] ?? EMPTY_IDS) : EMPTY_IDS,
  );
  const childBlockIds = allChildIds.filter((id) => Boolean(blocks[id]));
  const dispatch = useBuilderDispatch();
  const rootRef = useRef<HTMLElement | null>(null);
  const marquee = useMarquee(rootRef, dispatch);
  const insertFirst = useInsertSlot(section?.id ?? "");

  if (!section) {
    return (
      <main className="h-full overflow-auto p-6 text-sm text-muted-foreground">
        Select a section in the left rail to start writing.
      </main>
    );
  }

  if (childBlockIds.length === 0) {
    return (
      <main className="h-full overflow-auto">
        <div className="px-6 pt-8 pb-2">
          <div className="mx-auto w-full max-w-pane-wide">
            <header className="mb-6 flex items-baseline gap-3 border-b border-hairline pb-3">
              <h1 className="text-2xl font-semibold tracking-headline">
                {section.title}
              </h1>
              <span className="text-xs text-muted-foreground">(0 blocks)</span>
              <div className="ml-auto flex items-center gap-1">
                <ViewModeOverrideToggle entityId={section.id} />
              </div>
            </header>
          </div>
        </div>
        <EmptyStateCards
          context="docs"
          onPick={(kind) => insertFirst(kind, 0)}
        />
      </main>
    );
  }

  return (
    <main
      ref={rootRef}
      className="h-full overflow-auto bg-canvas px-6 py-8"
      onPointerDown={marquee.handlers.onPointerDown}
      onPointerMove={marquee.handlers.onPointerMove}
      onPointerUp={marquee.handlers.onPointerUp}
    >
      <div className="mx-auto w-full max-w-pane-wide">
        <header className="mb-6 flex items-baseline gap-3 border-b border-hairline pb-3">
          <h1 className="text-2xl font-semibold tracking-headline">
            {section.title}
          </h1>
          <span className="text-xs text-muted-foreground">
            ({childBlockIds.length} blocks)
          </span>
          <div className="ml-auto flex items-center gap-1">
            <ViewModeOverrideToggle entityId={section.id} />
          </div>
        </header>
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {childBlockIds.map((id, idx) => (
              <div key={id}>
                <InsertSlot parentId={section.id} index={idx} />
                <BlockShell blockId={id} />
              </div>
            ))}
          </AnimatePresence>
          <InsertSlot
            parentId={section.id}
            index={childBlockIds.length}
            variant="trailing"
          />
        </div>
      </div>
      <MarqueeOverlay box={marquee.box} />
    </main>
  );
}

function ScreenFrame({
  kind,
  screen,
  children,
}: {
  kind: ProjectKind | null;
  screen: ScreenEntity;
  children: ReactNode;
}) {
  if (kind === "web") {
    const url = screen.route ?? `https://app.local${screen.route ?? "/"}`;
    return (
      <BrowserFrame url={url} title={screen.title}>
        {children}
      </BrowserFrame>
    );
  }
  if (kind === "mobile") {
    return <MobileFrame title={screen.title}>{children}</MobileFrame>;
  }
  return (
    <div className="rounded-lg border border-hairline p-4">{children}</div>
  );
}
