"use client";

import { Plus, Unlink, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import type {
  ProjectKind,
  ScreenEdge,
  ScreenEntity,
} from "@/builder/types/entity";
import { Button } from "@/components/ui/button";
import {
  useBuilderDispatch,
  useBuilderState,
} from "@/hooks/builder/use-builder-store.hook";
import { cn } from "@/lib/utils";
import { useBuilderUiStore } from "@/services/stores";
import { FlowEdge } from "./frames";

const CARD_W = 220;
const CARD_H = 140;
const GAP_X = 60;
const GAP_Y = 60;
const COLS = 3;

type Position = { x: number; y: number };

function placedPosition(screen: ScreenEntity, fallbackIndex: number): Position {
  if (screen.position) return screen.position;
  const col = fallbackIndex % COLS;
  const row = Math.floor(fallbackIndex / COLS);
  return {
    x: 24 + col * (CARD_W + GAP_X),
    y: 24 + row * (CARD_H + GAP_Y),
  };
}

export function FlowCanvas({ kind }: { kind: ProjectKind }) {
  const planId = useBuilderState(
    (s) => Object.values(s.state.plans)[0]?.id ?? null,
  );
  const screensMap = useBuilderState((s) => s.state.screens);
  const screenEdgesMap = useBuilderState((s) => s.state.screenEdges);
  const dispatch = useBuilderDispatch();
  const setCanvasMode = useBuilderUiStore((s) => s.setCanvasMode);

  const screens = useMemo(
    () => Object.values(screensMap).filter((s) => s.planId === planId),
    [screensMap, planId],
  );
  const edges = useMemo(() => Object.values(screenEdgesMap), [screenEdgesMap]);

  const positioned = useMemo(
    () =>
      screens.map((screen, idx) => ({
        screen,
        position: placedPosition(screen, idx),
      })),
    [screens],
  );
  const positionById = useMemo(() => {
    const m = new Map<string, Position>();
    for (const p of positioned) m.set(p.screen.id, p.position);
    return m;
  }, [positioned]);

  const [connectMode, setConnectMode] = useState(false);
  const [connectFromId, setConnectFromId] = useState<string | null>(null);

  const handleAddScreen = () => {
    if (!planId) return;
    const fallbackIdx = screens.length;
    const screen: ScreenEntity = {
      id: crypto.randomUUID(),
      planId,
      title: `Screen ${screens.length + 1}`,
      position: {
        x: 24 + (fallbackIdx % COLS) * (CARD_W + GAP_X),
        y: 24 + Math.floor(fallbackIdx / COLS) * (CARD_H + GAP_Y),
      },
    };
    dispatch({ type: "INSERT_SCREEN", screen });
  };

  const handleEnterScreen = (screenId: string) => {
    dispatch({ type: "SWITCH_SCREEN", screenId });
    setCanvasMode("screen");
  };

  const handleCardClick = (screenId: string) => {
    if (!connectMode) {
      dispatch({ type: "SWITCH_SCREEN", screenId });
      // SELECT_NODE로 InspectPane이 ScreenInspector를 표시하도록 selection 갱신.
      dispatch({ type: "SELECT_NODE", nodeId: screenId });
      return;
    }
    if (connectFromId === null) {
      setConnectFromId(screenId);
      return;
    }
    if (connectFromId === screenId) {
      setConnectFromId(null);
      return;
    }
    const edge: ScreenEdge = {
      id: crypto.randomUUID(),
      from: connectFromId,
      to: screenId,
    };
    dispatch({ type: "INSERT_SCREEN_EDGE", edge });
    setConnectFromId(null);
    setConnectMode(false);
  };

  const handleDeleteEdge = (edgeId: string) => {
    dispatch({ type: "DELETE_SCREEN_EDGE", edgeId });
  };

  return (
    <main className="relative h-full overflow-auto bg-muted/30">
      <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-hairline bg-surface-1 px-4 py-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleAddScreen}
        >
          <Plus className="size-3.5" />
          Add screen
        </Button>
        <Button
          type="button"
          size="sm"
          variant={connectMode ? "default" : "outline"}
          onClick={() => {
            setConnectMode((m) => !m);
            setConnectFromId(null);
          }}
          aria-pressed={connectMode}
        >
          {connectMode ? "Connecting…" : "Connect"}
        </Button>
        {connectMode ? (
          <span className="text-xs text-muted-foreground">
            {connectFromId ? "Click target screen" : "Click source screen"}
          </span>
        ) : null}
        <span className="ml-auto text-xs text-muted-foreground">
          {screens.length} screens · {edges.length} edges · double-click to
          enter
        </span>
      </div>

      <div className="relative" style={{ minWidth: 1200, minHeight: 800 }}>
        {edges.map((edge) => {
          const a = positionById.get(edge.from);
          const b = positionById.get(edge.to);
          if (!a || !b) return null;
          const from = { x: a.x + CARD_W, y: a.y + CARD_H / 2 };
          const to = { x: b.x, y: b.y + CARD_H / 2 };
          return (
            <EdgeWithDelete
              key={edge.id}
              edge={edge}
              from={from}
              to={to}
              onDelete={() => handleDeleteEdge(edge.id)}
            />
          );
        })}

        {positioned.map(({ screen, position }) => (
          <ScreenCard
            key={screen.id}
            kind={kind}
            screen={screen}
            position={position}
            connectMode={connectMode}
            isConnectSource={connectFromId === screen.id}
            onClick={() => handleCardClick(screen.id)}
            onEnter={() => handleEnterScreen(screen.id)}
          />
        ))}
      </div>
    </main>
  );
}

function EdgeWithDelete({
  edge,
  from,
  to,
  onDelete,
}: {
  edge: ScreenEdge;
  from: Position;
  to: Position;
  onDelete: () => void;
}) {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  return (
    <>
      <FlowEdge from={from} to={to} label={edge.label} />
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete edge"
        title="Delete edge"
        className="absolute z-10 flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive hover:opacity-100"
        style={{ left: midX, top: midY, opacity: 0.6 }}
      >
        <Unlink className="size-3" />
      </button>
    </>
  );
}

function ScreenCard({
  kind,
  screen,
  position,
  connectMode,
  isConnectSource,
  onClick,
  onEnter,
}: {
  kind: ProjectKind;
  screen: ScreenEntity;
  position: Position;
  connectMode: boolean;
  isConnectSource: boolean;
  onClick: () => void;
  onEnter: () => void;
}) {
  const dispatch = useBuilderDispatch();
  const ref = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startPos: Position;
    moved: boolean;
  } | null>(null);
  const [livePos, setLivePos] = useState<Position | null>(null);

  const effectivePos = livePos ?? position;

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      if (connectMode) return;
      if ((e.target as HTMLElement).closest("button[data-no-drag]")) return;
      const node = ref.current;
      if (!node) return;
      node.setPointerCapture(e.pointerId);
      dragState.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startPos: position,
        moved: false,
      };
    },
    [position, connectMode],
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const ds = dragState.current;
    if (!ds || ds.pointerId !== e.pointerId) return;
    const dx = e.clientX - ds.startX;
    const dy = e.clientY - ds.startY;
    if (!ds.moved && Math.hypot(dx, dy) < 4) return;
    ds.moved = true;
    setLivePos({
      x: Math.max(0, ds.startPos.x + dx),
      y: Math.max(0, ds.startPos.y + dy),
    });
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const ds = dragState.current;
      if (!ds || ds.pointerId !== e.pointerId) return;
      const node = ref.current;
      if (node) node.releasePointerCapture(e.pointerId);
      const moved = ds.moved;
      dragState.current = null;
      if (moved && livePos) {
        dispatch({
          type: "UPDATE_SCREEN",
          screenId: screen.id,
          patch: { position: livePos },
        });
      }
      setLivePos(null);
      if (!moved) {
        onClick();
      }
    },
    [dispatch, livePos, screen.id, onClick],
  );

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: "DELETE_SCREEN", screenId: screen.id });
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: draggable card with nested buttons; native <button> would create invalid HTML (nested buttons) and conflict with pointer-capture
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragState.current = null;
        setLivePos(null);
      }}
      onDoubleClick={onEnter}
      onKeyDown={(e) => {
        if (e.key === "Enter") onEnter();
      }}
      className={cn(
        "group absolute select-none rounded-lg border border-hairline bg-background transition-colors",
        "hover:border-foreground/30",
        connectMode && !isConnectSource && "ring-1 ring-primary/30",
        isConnectSource && "ring-2 ring-primary",
        livePos && "cursor-grabbing ring-2 ring-ring",
        !livePos && !connectMode && "cursor-grab",
      )}
      style={{
        left: effectivePos.x,
        top: effectivePos.y,
        width: CARD_W,
        height: CARD_H,
      }}
    >
      <div className="flex items-center justify-between border-b px-2 py-1 text-xs">
        <span className="truncate font-medium">{screen.title}</span>
        <button
          type="button"
          data-no-drag
          onClick={handleDelete}
          aria-label={`Delete ${screen.title}`}
          title="Delete screen"
          className="ml-2 size-5 shrink-0 rounded-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:text-destructive flex items-center justify-center"
        >
          <X className="size-3" />
        </button>
      </div>
      <div className="flex h-[calc(100%-1.75rem)] items-center justify-center px-3 text-center text-caption text-muted-foreground">
        {kind === "web" ? "Browser" : "Mobile"} screen · double-click to open
        {screen.route ? (
          <>
            <br />
            <code className="text-caption">{screen.route}</code>
          </>
        ) : null}
      </div>
    </div>
  );
}
