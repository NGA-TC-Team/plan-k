"use client";

import { Plus, Trash2, Unlink } from "lucide-react";
import { useMemo, useState } from "react";
import type { AgentEdge, AgentNode } from "@/builder/types/entity";
import { Button } from "@/components/ui/button";
import {
  useBuilderDispatch,
  useBuilderState,
} from "@/hooks/builder/use-builder-store.hook";
import { cn } from "@/lib/utils";
import { FlowEdge } from "./frames";

const NODE_W = 160;
const NODE_H = 70;
const GAP_X = 60;
const GAP_Y = 50;
const COLS = 4;

const ROLES = ["input", "tool", "llm", "output"] as const;
type Role = (typeof ROLES)[number];

const ROLE_STYLES: Record<Role, string> = {
  input: "border-blue-400/60 bg-blue-50 dark:bg-blue-950/30",
  tool: "border-amber-400/60 bg-amber-50 dark:bg-amber-950/30",
  llm: "border-purple-400/60 bg-purple-50 dark:bg-purple-950/30",
  output: "border-emerald-400/60 bg-emerald-50 dark:bg-emerald-950/30",
};

type Position = { x: number; y: number };

function gridPosition(index: number): Position {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  return {
    x: 24 + col * (NODE_W + GAP_X),
    y: 24 + row * (NODE_H + GAP_Y),
  };
}

export function AgentGraph() {
  const nodesMap = useBuilderState((s) => s.state.agentNodes);
  const edgesMap = useBuilderState((s) => s.state.agentEdges);
  const dispatch = useBuilderDispatch();

  const nodes = useMemo(() => Object.values(nodesMap), [nodesMap]);
  const edges = useMemo(() => Object.values(edgesMap), [edgesMap]);

  const positionById = useMemo(() => {
    const m = new Map<string, Position>();
    nodes.forEach((node, idx) => {
      m.set(node.id, gridPosition(idx));
    });
    return m;
  }, [nodes]);

  const [connectMode, setConnectMode] = useState(false);
  const [connectFromId, setConnectFromId] = useState<string | null>(null);

  const handleAddNode = (role: Role) => {
    const node: AgentNode = {
      id: crypto.randomUUID(),
      role,
      label: `${role.charAt(0).toUpperCase()}${role.slice(1)} ${nodes.length + 1}`,
      data: {},
    };
    dispatch({ type: "INSERT_AGENT_NODE", node });
  };

  const handleNodeClick = (nodeId: string) => {
    if (!connectMode) return;
    if (connectFromId === null) {
      setConnectFromId(nodeId);
      return;
    }
    if (connectFromId === nodeId) {
      setConnectFromId(null);
      return;
    }
    const edge: AgentEdge = {
      id: crypto.randomUUID(),
      from: connectFromId,
      to: nodeId,
    };
    dispatch({ type: "CONNECT_AGENT_NODES", edge });
    setConnectFromId(null);
    setConnectMode(false);
  };

  const handleDeleteNode = (nodeId: string) => {
    dispatch({ type: "DELETE_AGENT_NODE", nodeId });
  };

  const handleDeleteEdge = (edgeId: string) => {
    dispatch({ type: "DISCONNECT_AGENT_NODES", edgeId });
  };

  return (
    <main className="relative h-full overflow-auto bg-muted/30">
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b bg-background/85 px-4 py-2 backdrop-blur">
        {ROLES.map((role) => (
          <Button
            key={role}
            type="button"
            size="sm"
            variant="outline"
            onClick={() => handleAddNode(role)}
          >
            <Plus className="size-3.5" />
            {role}
          </Button>
        ))}
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
            {connectFromId ? "Click target node" : "Click source node"}
          </span>
        ) : null}
        <span className="ml-auto text-xs text-muted-foreground">
          {nodes.length} nodes · {edges.length} edges
        </span>
      </div>

      <div className="relative" style={{ minWidth: 1100, minHeight: 600 }}>
        {edges.map((edge) => {
          const a = positionById.get(edge.from);
          const b = positionById.get(edge.to);
          if (!a || !b) return null;
          const from = { x: a.x + NODE_W, y: a.y + NODE_H / 2 };
          const to = { x: b.x, y: b.y + NODE_H / 2 };
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          return (
            <span key={edge.id}>
              <FlowEdge from={from} to={to} />
              <button
                type="button"
                onClick={() => handleDeleteEdge(edge.id)}
                aria-label="Disconnect"
                title="Disconnect"
                className="absolute z-10 flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-opacity hover:bg-destructive/10 hover:text-destructive"
                style={{ left: midX, top: midY, opacity: 0.6 }}
              >
                <Unlink className="size-3" />
              </button>
            </span>
          );
        })}

        {nodes.map((node) => {
          const pos = positionById.get(node.id);
          if (!pos) return null;
          const isSource = connectFromId === node.id;
          return (
            // biome-ignore lint/a11y/useSemanticElements: nested delete <button> requires non-button container
            <div
              key={node.id}
              role="button"
              tabIndex={0}
              className={cn(
                "group absolute rounded-md border shadow-sm transition-shadow",
                ROLE_STYLES[node.role],
                connectMode && "cursor-crosshair",
                isSource && "ring-2 ring-primary",
              )}
              style={{
                left: pos.x,
                top: pos.y,
                width: NODE_W,
                height: NODE_H,
              }}
              onClick={() => handleNodeClick(node.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleNodeClick(node.id);
                }
              }}
            >
              <div className="flex items-center justify-between border-b px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <span>{node.role}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNode(node.id);
                  }}
                  aria-label={`Delete ${node.label}`}
                  title="Delete node"
                  className="size-4 rounded text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 flex items-center justify-center"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
              <div className="flex h-[calc(100%-1.5rem)] items-center justify-center px-2 text-center text-xs font-medium">
                <span className="truncate">{node.label}</span>
              </div>
            </div>
          );
        })}

        {nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Empty graph — add an input/tool/llm/output node to start.
          </div>
        ) : null}
      </div>
    </main>
  );
}
