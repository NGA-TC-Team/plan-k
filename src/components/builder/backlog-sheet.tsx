"use client";

import { Ellipsis, FileDown, Maximize2, Minimize2, Trash2 } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { defaultDataFor } from "@/builder/defaults";
import type { BlockEntity, PropertyEntry } from "@/builder/types/entity";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useBuilderDispatch,
  useBuilderState,
} from "@/hooks/builder/use-builder-store.hook";
import { useSheetHistory } from "@/hooks/use-sheet-history";
import { copyToClipboard } from "@/lib/clipboard";
import { sectionToMarkdown } from "@/lib/section-to-markdown";
import { cn } from "@/lib/utils";
import { useBacklogStore } from "@/services/stores";
import { BacklogProperties } from "./backlog-properties";
import { ConfirmDestructiveDialog } from "./confirm-destructive-dialog";
import { EditableBlock } from "./editable-block";
import { InsertSlot } from "./insert-slot";
import { EntityStatusChip } from "./status-chip";
import { VirtualBlockList } from "./virtual-block-list";

// ── BacklogSelectionContext ────────────────────────────────────────────────────
// Carries the "outer selected" table state for 2-step table deletion.
// EditableBlock reads selectedTableId; BacklogSheet owns and updates the state.

type BacklogSelectionCtx = {
  selectedTableId: string | null;
  setSelectedTableId: (id: string | null) => void;
};

export const BacklogSelectionContext = createContext<BacklogSelectionCtx>({
  selectedTableId: null,
  setSelectedTableId: () => {},
});

export function useBacklogSelection(): BacklogSelectionCtx {
  return useContext(BacklogSelectionContext);
}

const EMPTY_IDS: readonly string[] = Object.freeze([]);

export function BacklogSheet() {
  const openId = useBacklogStore((s) => s.openSheetId);
  const setOpenSheet = useBacklogStore((s) => s.setOpenSheet);
  const unregister = useBacklogStore((s) => s.unregister);
  const section = useBuilderState((s) =>
    openId ? s.state.sections[openId] : undefined,
  );
  const childIds = useBuilderState((s) =>
    openId ? (s.state.children[openId] ?? EMPTY_IDS) : EMPTY_IDS,
  );
  const blocks = useBuilderState((s) => s.state.blocks);
  const childBlockIds = childIds.filter((id) => Boolean(blocks[id]));
  // Full AppState snapshot — needed for sectionToMarkdown serialization.
  const appState = useBuilderState((s) => s.state);
  const dispatch = useBuilderDispatch();

  // ── Delete confirm dialog ─────────────────────────────────────────────────
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // ── Fullscreen toggle ─────────────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Reset fullscreen when the sheet opens a different section.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — reset only on section identity change, not on every render
  useEffect(() => {
    setIsFullscreen(false);
  }, [openId]);

  // ── Empty-section seed ───────────────────────────────────────────────────
  useEffect(() => {
    if (!section) return;
    if (childBlockIds.length > 0) return;
    const seedBlock: BlockEntity = {
      id: crypto.randomUUID(),
      parentId: section.id,
      kind: "paragraph",
      context: "docs",
      data: { ...defaultDataFor("paragraph"), markdown: "" },
    };
    dispatch({
      type: "INSERT_BLOCK",
      parentId: section.id,
      block: seedBlock,
      index: 0,
    });
  }, [section, childBlockIds.length, dispatch]);

  // scrollEl: the overflow-y-auto container that acts as the virtual scroll
  // parent.
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  // ── Table outer-selection state ──────────────────────────────────────────
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  useEffect(() => {
    if (section) setTitle(section.title);
  }, [section]);

  // Stable ref for the title input — used by block ArrowUp fallback.
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  const flushTitle = useCallback(() => {
    if (!section) return;
    const next = title.trim();
    if (next === section.title) return;
    dispatch({
      type: "UPDATE_SECTION",
      sectionId: section.id,
      patch: { title: next || "Untitled" },
    });
  }, [section, title, dispatch]);

  const onClose = useCallback(() => {
    flushTitle();
    setOpenSheet(null);
  }, [flushTitle, setOpenSheet]);

  // ── Browser back: exit fullscreen first, then close ──────────────────────
  const onExitFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);
  useSheetHistory(Boolean(openId), isFullscreen, onClose, onExitFullscreen);

  const onDeleteConfirmed = () => {
    if (!section) return;
    dispatch({ type: "DELETE_SECTION", sectionId: section.id });
    unregister(section.planId, section.id);
    setOpenSheet(null);
  };

  const onDelete = () => {
    setDeleteDialogOpen(true);
  };

  const onCopyMarkdown = async () => {
    if (!section) return;
    const md = sectionToMarkdown(appState, section.id);
    const ok = await copyToClipboard(md);
    if (ok) {
      toast("콘텐츠를 클립보드에 복사했습니다");
    } else {
      toast.error("복사 실패: 클립보드 접근 권한을 확인하세요");
    }
  };

  const onExportPdf = () => {
    if (!section) return;
    const url = `/api/exports/pdf?planId=${section.planId}&sectionId=${section.id}`;
    window.open(url, "_blank", "noopener,noreferrer");
    toast("PDF 새 탭에서 생성 중…");
  };

  const onPropertiesChange = (next: PropertyEntry[]) => {
    if (!section) return;
    dispatch({
      type: "UPDATE_SECTION",
      sectionId: section.id,
      patch: { properties: next },
    });
  };

  // ── Sheet-level keydown: handles table 2-step deletion + ESC dismiss ────
  const handleSheetKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (selectedTableId !== null) {
      if (e.key === "Backspace") {
        e.preventDefault();
        dispatch({ type: "DELETE_BLOCK", nodeId: selectedTableId });
        setSelectedTableId(null);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSelectedTableId(null);
        return;
      }
      if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key.length === 1) {
        setSelectedTableId(null);
      }
    }
  };

  // ── Empty-area click → insert paragraph ──────────────────────────────────
  // Only fires when clicking directly on the scroll container or on blank space
  // that is not inside a block, input, contenteditable, or the properties panel.
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!section) return;
    const target = e.target as Element;

    // React portals bubble synthetic events through the React tree, not the
    // DOM tree — so clicks on portaled menus (DropdownMenu, Popover, etc.)
    // reach this handler. Skip anything that isn't a DOM descendant of the
    // scroll container.
    if (!e.currentTarget.contains(target)) return;

    // Guard: ignore clicks inside blocks, inputs, contenteditables, or the
    // properties panel (each guard is required — missing one causes spurious
    // block insertion on legitimate click targets).
    if (target.closest("[data-block-id]")) return;
    if (target.closest("input, textarea, [contenteditable='true']")) return;
    if (target.closest("[data-backlog-properties]")) return;
    // Also ignore the title input area and toolbar.
    if (target.closest("[data-backlog-title]")) return;
    if (target.closest("[data-backlog-toolbar]")) return;

    // Collect all rendered block elements and sort by visual position.
    const sheetRoot = e.currentTarget;
    const blockEls = Array.from(
      sheetRoot.querySelectorAll<HTMLElement>("[data-block-id]"),
    );
    blockEls.sort(
      (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top,
    );

    // Determine insert index: find where the click Y falls between blocks.
    // Clicks below all blocks → append at end.
    const clickY = e.clientY;
    let insertIndex = childBlockIds.length; // default: append
    for (let i = 0; i < blockEls.length; i++) {
      const el = blockEls[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (clickY < midY) {
        insertIndex = i;
        break;
      }
    }

    const newBlock: BlockEntity = {
      id: crypto.randomUUID(),
      parentId: section.id,
      kind: "paragraph",
      context: "docs",
      data: { ...defaultDataFor("paragraph"), markdown: "" },
    };
    dispatch({
      type: "INSERT_BLOCK",
      parentId: section.id,
      block: newBlock,
      index: insertIndex,
    });

    // Focus the new block after React commits the DOM.
    requestAnimationFrame(() => {
      const frame = document.querySelector(
        `[data-block-id="${CSS.escape(newBlock.id)}"]`,
      );
      const editor = frame?.querySelector<HTMLElement>(
        "[contenteditable='true']",
      );
      if (editor) {
        editor.focus();
      }
    });
  };

  return (
    <>
      <Sheet
        open={Boolean(openId)}
        onOpenChange={(next) => {
          if (!next) onClose();
        }}
      >
        <SheetContent
          className={cn(
            "flex flex-col gap-0",
            isFullscreen
              ? "!fixed !inset-0 !max-w-none !w-full !h-full !translate-x-0 rounded-none border-0"
              : "w-full sm:!max-w-[56rem]",
          )}
        >
          <SheetTitle className="sr-only">
            {section?.title ?? "Backlog item"}
          </SheetTitle>
          <SheetDescription className="sr-only">
            노션 페이지처럼 본문에 블록을 추가할 수 있습니다.
          </SheetDescription>
          {section ? (
            <BacklogSelectionContext.Provider
              value={{ selectedTableId, setSelectedTableId }}
            >
              {/* biome-ignore lint/a11y/noStaticElementInteractions: sheet content captures keyboard for table 2-step delete */}
              <div className="contents" onKeyDown={handleSheetKeyDown}>
                {/* pr-12: leaves room for SheetContent's absolute X close button */}
                <div
                  data-backlog-toolbar="true"
                  className="flex items-center justify-between gap-2 border-b px-4 py-1.5 pr-12"
                >
                  {/* Left: entity status chip */}
                  <EntityStatusChip entityId={section.id} variant="pill" />

                  {/* Right: fullscreen toggle + more actions dropdown + delete */}
                  <div className="flex items-center gap-1">
                    {/* Fullscreen toggle — placed left of the ... dropdown */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsFullscreen((v) => !v)}
                      aria-label={
                        isFullscreen ? "사이드에서 보기" : "전체 보기"
                      }
                      title={isFullscreen ? "사이드에서 보기" : "전체 보기"}
                    >
                      {isFullscreen ? (
                        <Minimize2 className="size-4" />
                      ) : (
                        <Maximize2 className="size-4" />
                      )}
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="더 보기"
                            title="더 보기"
                          >
                            <Ellipsis className="size-4" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" side="bottom">
                        <DropdownMenuItem onSelect={onCopyMarkdown}>
                          콘텐츠 복사하기
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={onExportPdf}>
                          <FileDown className="size-4" />
                          PDF로 내보내기
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={onDelete}
                      aria-label="Delete"
                      title="Delete"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
                {/* scroll parent — VirtualBlockList's scrollElement prop points here.
                  onClick is on this div: only fires for blank padding areas below
                  (handleContainerClick guards for block/input/property targets). */}
                {/* biome-ignore lint/a11y/noStaticElementInteractions: scroll container captures click for empty-area block insertion; blocks handle keyboard navigation */}
                {/* biome-ignore lint/a11y/useKeyWithClickEvents: empty-area click does not require keyboard equivalent — blocks themselves handle keyboard navigation */}
                <div
                  ref={setScrollEl}
                  data-backlog-sheet="true"
                  className="flex-1 overflow-y-auto px-12 py-10"
                  onClick={handleContainerClick}
                >
                  <div className="mx-auto max-w-2xl">
                    <input
                      ref={titleInputRef}
                      data-backlog-title="true"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={flushTitle}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          flushTitle();
                          (e.currentTarget as HTMLInputElement).blur();
                          return;
                        }
                        // ArrowDown: move focus to first block at offset 0.
                        if (e.key === "ArrowDown") {
                          const sheetRoot = (
                            e.currentTarget as HTMLInputElement
                          ).closest<HTMLElement>("[data-backlog-sheet]");
                          if (!sheetRoot) return;
                          const blockEls = Array.from(
                            sheetRoot.querySelectorAll<HTMLElement>(
                              "[data-block-id]",
                            ),
                          );
                          blockEls.sort(
                            (a, b) =>
                              a.getBoundingClientRect().top -
                              b.getBoundingClientRect().top,
                          );
                          const first = blockEls[0];
                          if (!first) return;
                          const editor = first.querySelector<HTMLElement>(
                            "[contenteditable='true']",
                          );
                          if (!editor) return;
                          e.preventDefault();
                          editor.focus();
                          // Place caret at offset 0 (start).
                          const sel = window.getSelection();
                          if (sel) {
                            const range = document.createRange();
                            range.selectNodeContents(editor);
                            range.collapse(true);
                            sel.removeAllRanges();
                            sel.addRange(range);
                          }
                        }
                      }}
                      placeholder="Untitled"
                      aria-label="Title"
                      className="w-full border-0 bg-transparent p-0 text-3xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/40 focus:ring-0"
                    />

                    {/* Property panel — Notion DB page style */}
                    <BacklogProperties
                      section={section}
                      onChange={onPropertiesChange}
                    />

                    <div className="mt-8">
                      {/* VirtualBlockList: only DOM-renders visible blocks.
                        Each row includes a leading InsertSlot (between) so the
                        user can insert before any block, plus a trailing InsertSlot
                        on the final row so there is always an append target.
                        measureElement reads the full row height (InsertSlot +
                        EditableBlock [+ trailing]) automatically. */}
                      <VirtualBlockList
                        ids={childBlockIds}
                        render={(id) => {
                          const idx = childBlockIds.indexOf(id);
                          const isLast = idx === childBlockIds.length - 1;
                          return (
                            <>
                              <InsertSlot
                                parentId={section.id}
                                index={idx}
                                variant="between"
                              />
                              <EditableBlock
                                blockId={id}
                                parentId={section.id}
                              />
                              {isLast && (
                                <InsertSlot
                                  parentId={section.id}
                                  index={childBlockIds.length}
                                  variant="trailing"
                                />
                              )}
                            </>
                          );
                        }}
                        scrollElement={scrollEl}
                        estimateSize={48}
                        overscan={10}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </BacklogSelectionContext.Provider>
          ) : null}
        </SheetContent>
      </Sheet>
      <ConfirmDestructiveDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="섹션 삭제"
        description={`이 섹션과 자식 블록 ${childBlockIds.length}개를 함께 삭제합니다. 되돌릴 수 없습니다.`}
        onConfirm={onDeleteConfirmed}
      />
    </>
  );
}
