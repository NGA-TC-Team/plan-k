"use client";

import {
  Copy,
  CopyPlus,
  MessageSquare,
  Pencil,
  Settings2,
  Tag,
  Trash2,
} from "lucide-react";
import { useCallback, useContext, useEffect, useRef } from "react";
import { iconForBlock } from "@/builder/blocks/icons";
import { manifestFor, summaryFor } from "@/builder/blocks/registry";
import {
  projectAgentNodeInspect,
  projectBlock,
  projectScreenInspect,
  projectSectionInspect,
  resolveEntityKind,
} from "@/builder/projection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBlock } from "@/hooks/builder/use-block.hook";
import {
  handleCopy,
  handleDuplicate,
} from "@/hooks/builder/use-builder-shortcuts.hook";
import {
  useBuilderDispatch,
  useBuilderState,
  useBuilderStateShallow,
} from "@/hooks/builder/use-builder-store.hook";
import {
  PANEL_WIDTH_BOUNDS,
  type SidePanelTab,
  useChatStore,
  usePanelStore,
  usePanelWidthPersistence,
} from "@/services/stores";
import { BacklinksPanel } from "./backlinks-panel";
import { BuilderContext } from "./builder-context";
import { ChatPane } from "./chat/chat-pane";
import {
  AgentNodeInspector,
  ScreenInspector,
  SectionInspector,
} from "./inspectors";
import { PropertyList, PropertyTable } from "./property-list";
import { PropertyStatus } from "./property-status";
import { pickEditor } from "./renderers/editors";
import { InteractionsSection } from "./renderers/editors/_common/interactions-section";
import { SpacingSection } from "./renderers/editors/_common/spacing-section";

export function SidePanel() {
  usePanelWidthPersistence();
  const width = usePanelStore((s) => s.width);
  const setWidth = usePanelStore((s) => s.setWidth);

  const tab = useChatStore((s) => s.tab);
  const setTab = useChatStore((s) => s.setTab);

  const editingId = useBuilderState((s) =>
    s.state.editing.kind === "node" ? s.state.editing.id : null,
  );
  const selectionId = useBuilderState((s) =>
    s.state.selection.kind === "node" ? s.state.selection.id : null,
  );
  const multiCount = useBuilderState((s) =>
    s.state.selection.kind === "multi" ? s.state.selection.ids.length : 0,
  );

  const startResize = useResizeHandle(setWidth);

  return (
    <aside
      aria-label="Right panel"
      className="relative hidden h-full min-h-0 border-l text-sm lg:flex lg:flex-col lg:overflow-hidden"
      style={{ width }}
    >
      <button
        type="button"
        aria-label="Resize panel"
        onPointerDown={startResize}
        className="group absolute left-0 top-0 bottom-0 z-20 flex w-2 -translate-x-1/2 cursor-col-resize items-center justify-center bg-transparent"
      >
        <span className="block h-full w-px bg-border transition-colors group-focus-visible:bg-primary/60" />
      </button>
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as SidePanelTab)}
        className="flex h-full min-h-0 flex-col gap-0"
      >
        <TabsList variant="line" className="mx-4 mt-3 self-start">
          <TabsTrigger value="chat" className="gap-1.5 text-caption">
            <MessageSquare className="size-3" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="properties" className="gap-1.5 text-caption">
            <Settings2 className="size-3" />
            Properties
          </TabsTrigger>
        </TabsList>
        <TabsContent value="chat" className="flex min-h-0 flex-1 flex-col">
          <ChatPane />
        </TabsContent>
        <TabsContent
          value="properties"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          {editingId ? (
            <EditorPane key={editingId} blockId={editingId} />
          ) : selectionId ? (
            <InspectPane key={selectionId} entityId={selectionId} />
          ) : multiCount > 0 ? (
            <MultiPane count={multiCount} />
          ) : (
            <IdleState />
          )}
        </TabsContent>
      </Tabs>
    </aside>
  );
}

function IdleState() {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-2 p-5 text-center text-xs text-muted-foreground">
      <div className="font-medium text-foreground">Select a block</div>
      <div>
        Click to select · Double-click or <kbd>Enter</kbd> to edit
      </div>
    </div>
  );
}

function EditorPane({ blockId }: { blockId: string }) {
  const { vm, handlers } = useBlock(blockId);
  if (!vm)
    return (
      <div className="p-5">
        <FallbackMessage>Block missing</FallbackMessage>
      </div>
    );
  const Editor = pickEditor(vm.context, vm.kind);
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto p-5">
      <Editor vm={vm} handlers={handlers} />
    </div>
  );
}

/**
 * InspectPane — entity-kind agnostic 진입점.
 * resolveEntityKind로 kind를 판별 후 각 Inspector 컴포넌트에 위임.
 * block → 기존 BlockInspector 흐름, 나머지 → 신규 inspectors/ 폴더.
 */
function InspectPane({ entityId }: { entityId: string }) {
  const kind = useBuilderState((s) => resolveEntityKind(s.state, entityId));

  if (kind === null)
    return (
      <div className="p-5">
        <FallbackMessage>Selection no longer exists</FallbackMessage>
      </div>
    );

  if (kind === "screen") return <ScreenInspectPane entityId={entityId} />;
  if (kind === "section") return <SectionInspectPane entityId={entityId} />;
  if (kind === "agent-node")
    return <AgentNodeInspectPane entityId={entityId} />;
  // kind === "block"
  return <BlockInspectPane blockId={entityId} />;
}

function ScreenInspectPane({ entityId }: { entityId: string }) {
  const vm = useBuilderStateShallow((s) =>
    projectScreenInspect(s.state, entityId),
  );
  if (!vm)
    return (
      <div className="p-5">
        <FallbackMessage>Screen no longer exists</FallbackMessage>
      </div>
    );
  return <ScreenInspector vm={vm} />;
}

function SectionInspectPane({ entityId }: { entityId: string }) {
  const vm = useBuilderStateShallow((s) =>
    projectSectionInspect(s.state, entityId),
  );
  if (!vm)
    return (
      <div className="p-5">
        <FallbackMessage>Section no longer exists</FallbackMessage>
      </div>
    );
  return <SectionInspector vm={vm} />;
}

function AgentNodeInspectPane({ entityId }: { entityId: string }) {
  const vm = useBuilderStateShallow((s) =>
    projectAgentNodeInspect(s.state, entityId),
  );
  if (!vm)
    return (
      <div className="p-5">
        <FallbackMessage>Agent node no longer exists</FallbackMessage>
      </div>
    );
  return <AgentNodeInspector vm={vm} />;
}

function BlockInspectPane({ blockId }: { blockId: string }) {
  const vm = useBuilderStateShallow((s) => projectBlock(s.state, blockId));
  const { handlers } = useBlock(blockId);
  if (!vm)
    return (
      <div className="p-5">
        <FallbackMessage>Block missing</FallbackMessage>
      </div>
    );
  const manifest = manifestFor(vm.kind);
  const summary = summaryFor(vm.kind, vm.data);
  const BlockIcon = iconForBlock(vm.kind);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="divide-y divide-hairline [&>*]:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
          <header className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-caption gap-1">
                <BlockIcon className="size-3" />
                <span>{manifest.label}</span>
              </Badge>
              <span className="text-caption font-medium uppercase tracking-eyebrow text-muted-foreground">
                {manifest.group}
              </span>
              {vm.isPending ? (
                <Badge className="bg-ring/15 text-ring hover:bg-ring/15">
                  <span className="size-1.5 rounded-full bg-ring" />
                  Saving…
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {summary}
            </p>
          </header>

          <section>
            <PropertyStatus entityId={vm.id} />
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-eyebrow text-muted-foreground">
              <Settings2 className="size-3" />
              <span>Properties</span>
            </h2>
            <PropertyList kind={vm.kind} data={vm.data} />
          </section>

          {vm.context === "app" || vm.context === "docs" ? (
            <section>
              <SpacingSection blockId={vm.id} kind={vm.kind} data={vm.data} />
            </section>
          ) : null}
          {vm.context === "app" ? (
            <section>
              <InteractionsSection
                blockId={vm.id}
                kind={vm.kind}
                data={vm.data}
              />
            </section>
          ) : null}

          <BacklinksPanel dstId={vm.id} />

          <section>
            <h2 className="mb-3 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-eyebrow text-muted-foreground">
              <Tag className="size-3" />
              <span>Meta</span>
            </h2>
            <PropertyTable
              rows={[
                {
                  label: "id",
                  value: (
                    <code className="font-mono text-caption">
                      {vm.id.slice(0, 8)}…
                    </code>
                  ),
                },
                {
                  label: "parent",
                  value: (
                    <code className="font-mono text-caption">
                      {vm.parentId.slice(0, 8)}…
                    </code>
                  ),
                },
                {
                  label: "sync",
                  value: (
                    <span className="text-caption">
                      {vm.isPending ? "⏳ pending" : "✓ saved"}
                    </span>
                  ),
                },
              ]}
            />
          </section>
        </div>
      </div>
      <div className="shrink-0 border-t border-hairline bg-surface-1 px-5 py-3">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handlers.onBeginEdit}>
            <Pencil className="size-3.5" />
            <span>Edit</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handlers.onDelete}
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
            <span>Delete</span>
          </Button>
        </div>
        <p className="mt-2 text-caption text-muted-foreground">
          <kbd>Enter</kbd> to edit · <kbd>Delete</kbd> to remove · <kbd>⌘Z</kbd>{" "}
          to undo
        </p>
      </div>
    </div>
  );
}

function MultiPane({ count }: { count: number }) {
  const dispatch = useBuilderDispatch();
  const storeHook = useContext(BuilderContext);
  const ids = useBuilderState((s) =>
    s.state.selection.kind === "multi"
      ? s.state.selection.ids
      : s.state.selection.kind === "node"
        ? [s.state.selection.id]
        : [],
  );
  const blocks = useBuilderState((s) => s.state.blocks);

  // Distribution by kind so the user understands what they have selected.
  const byKind = new Map<string, number>();
  for (const id of ids) {
    const kind = blocks[id]?.kind;
    if (!kind) continue;
    byKind.set(kind, (byKind.get(kind) ?? 0) + 1);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-5">
        <header className="space-y-1">
          <Badge variant="outline" className="text-caption">
            {count} selected
          </Badge>
          <p className="text-xs text-muted-foreground">
            여러 블록이 선택됐습니다. 공통 속성 편집은 곧 지원 예정입니다.
            지금은 일괄 복사 / 복제 / 삭제만 가능합니다.
          </p>
        </header>
        <section>
          <h2 className="mb-3 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-eyebrow text-muted-foreground">
            <Tag className="size-3" />
            <span>Distribution</span>
          </h2>
          <PropertyTable
            rows={Array.from(byKind.entries()).map(([kind, n]) => ({
              label: kind,
              value: <span className="text-caption">{n}</span>,
            }))}
          />
        </section>
      </div>
      <div className="shrink-0 border-t border-hairline bg-surface-1 px-5 py-3">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (storeHook) handleCopy(storeHook);
            }}
          >
            <Copy className="size-3.5" />
            <span>Copy ({count})</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (storeHook) handleDuplicate(storeHook, dispatch);
            }}
          >
            <CopyPlus className="size-3.5" />
            <span>Duplicate</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              dispatch({
                type: "BATCH",
                intents: ids.map((id) => ({
                  type: "DELETE_BLOCK" as const,
                  nodeId: id,
                })),
              });
            }}
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
            <span>Delete all</span>
          </Button>
        </div>
        <p className="mt-2 text-caption text-muted-foreground">
          <kbd>⌘C</kbd> 복사 · <kbd>⌘V</kbd> 붙여넣기 · <kbd>⌘D</kbd> 복제 ·{" "}
          <kbd>Delete</kbd> 일괄 삭제
        </p>
      </div>
    </div>
  );
}

function FallbackMessage({ children }: { children: React.ReactNode }) {
  return <div className="text-xs text-muted-foreground">{children}</div>;
}

/**
 * Drag the resizer handle to change panel width. Clamped via the store's
 * `setWidth` (PANEL_WIDTH_BOUNDS).
 */
function useResizeHandle(setWidth: (w: number) => void) {
  const startXRef = useRef(0);
  const startWRef = useRef(0);

  const onMove = useCallback(
    (e: PointerEvent) => {
      const delta = startXRef.current - e.clientX;
      setWidth(startWRef.current + delta);
    },
    [setWidth],
  );

  const onUp = useCallback(() => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    document.body.style.cursor = "";
  }, [onMove]);

  useEffect(() => () => onUp(), [onUp]);

  return (e: React.PointerEvent) => {
    startXRef.current = e.clientX;
    startWRef.current =
      usePanelStore.getState().width || PANEL_WIDTH_BOUNDS.default;
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
}
