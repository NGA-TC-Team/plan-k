"use client";

import { AnimatePresence } from "motion/react";
import { type ReactNode, useRef } from "react";
import type { ProjectKind, ScreenEntity } from "@/builder/types/entity";
import { useBuilderShortcuts } from "@/hooks/builder/use-builder-shortcuts.hook";
import {
  useBuilderDispatch,
  useBuilderState,
} from "@/hooks/builder/use-builder-store.hook";
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
import { FlowCanvas } from "./flow-canvas";
import { BrowserFrame, MobileFrame } from "./frames";
import { InsertSlot } from "./insert-slot";
import { LeftRail } from "./left-rail";
import { MarqueeOverlay } from "./marquee-overlay";
import { SidePanel } from "./side-panel";
import { TopBar } from "./top-bar";

const EMPTY_IDS: readonly string[] = Object.freeze([]);

export function BuilderPage({ planId }: { planId: string }) {
  return (
    <BuilderProvider planId={planId}>
      <BuilderShell />
    </BuilderProvider>
  );
}

function BuilderShell() {
  useBuilderShortcuts();
  const runState = useChatStore((s) => s.runState);
  const aiActive = runState !== "idle";
  const leftCollapsed = useBuilderUiStore((s) => s.leftRailCollapsed);
  const zenMode = useBuilderUiStore((s) => s.zenMode);
  const rightWidth = usePanelStore((s) => s.width);
  const leftWidth = leftCollapsed ? 36 : 260;

  // Zen: collapse side panels to 0; canvas expands to fill.
  // Width + opacity transition 200ms ease-out applied on the wrapper divs.
  const effectiveLeft = zenMode ? 0 : leftWidth;
  const effectiveRight = zenMode ? 0 : rightWidth;

  return (
    <div className="grid h-screen grid-rows-[auto_1fr]">
      <TopBar />
      <div
        className="grid overflow-hidden transition-[grid-template-columns] duration-200 ease-out"
        style={{
          gridTemplateColumns: `${effectiveLeft}px 1fr ${effectiveRight}px`,
        }}
      >
        {/* LeftRail wrapper: overflow-hidden ensures content is clipped as width shrinks */}
        <div
          className="overflow-hidden transition-opacity duration-200 ease-out"
          style={{ opacity: zenMode ? 0 : 1 }}
        >
          <LeftRail />
        </div>
        <div
          data-ai-active={aiActive ? "true" : undefined}
          data-ai-state={runState}
          className={cn(
            "canvas-shell relative min-h-0 overflow-hidden",
            aiActive && "ai-active",
          )}
        >
          <Canvas />
        </div>
        {/* SidePanel wrapper: same fade pattern as LeftRail */}
        <div
          className="overflow-hidden transition-opacity duration-200 ease-out"
          style={{ opacity: zenMode ? 0 : 1 }}
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

  if (!screen) {
    return (
      <main className="h-full overflow-auto p-6 text-sm text-muted-foreground">
        No screen selected — open a Web/Mobile demo to see the builder canvas.
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

  if (!section) {
    return (
      <main className="h-full overflow-auto p-6 text-sm text-muted-foreground">
        Select a section in the left rail to start writing.
      </main>
    );
  }

  return (
    <main
      ref={rootRef}
      className="h-full overflow-auto p-6"
      onPointerDown={marquee.handlers.onPointerDown}
      onPointerMove={marquee.handlers.onPointerMove}
      onPointerUp={marquee.handlers.onPointerUp}
    >
      <div className="mb-4 text-sm">
        <span className="font-medium">{section.title}</span>
        <span className="ml-2 text-xs text-muted-foreground">
          ({childBlockIds.length} blocks)
        </span>
      </div>
      <div className="rounded-lg border p-4">
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
  return <div className="rounded-lg border p-4">{children}</div>;
}
