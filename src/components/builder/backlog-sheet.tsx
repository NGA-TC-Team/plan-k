"use client";

import { Ellipsis, FileDown, Trash2 } from "lucide-react";
import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "sonner";
import { defaultDataFor } from "@/builder/defaults";
import type { BlockEntity } from "@/builder/types/entity";
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
import { copyToClipboard } from "@/lib/clipboard";
import { sectionToMarkdown } from "@/lib/section-to-markdown";
import { useBacklogStore } from "@/services/stores";
import { EditableBlock } from "./editable-block";
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

  // ── Empty-section seed ───────────────────────────────────────────────────
  // When a section has no child blocks (e.g. freshly created or pre-existing
  // empty), insert a single blank paragraph so there is always an editable
  // entry point. Re-runs only when section identity or child count changes;
  // the length > 0 guard makes it a no-op after the seed block is added.
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
  // parent. Stored in state (not a ref) so that when the DOM node is first
  // attached after mount, React re-renders and VirtualBlockList's virtualizer
  // can attach its ResizeObserver/ScrollObserver on the real element.
  // The ref-callback pattern (setScrollEl) guarantees the state flip happens
  // synchronously in the same commit as the DOM attachment.
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);

  // ── Table outer-selection state ──────────────────────────────────────────
  // Two-step table deletion: first Backspace → ring highlight, second → DELETE.
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  useEffect(() => {
    if (section) setTitle(section.title);
  }, [section]);

  const flushTitle = () => {
    if (!section) return;
    const next = title.trim();
    if (next === section.title) return;
    dispatch({
      type: "UPDATE_SECTION",
      sectionId: section.id,
      patch: { title: next || "Untitled" },
    });
  };

  const onClose = () => {
    flushTitle();
    setOpenSheet(null);
  };

  const onDelete = () => {
    if (!section) return;
    dispatch({ type: "DELETE_SECTION", sectionId: section.id });
    unregister(section.planId, section.id);
    setOpenSheet(null);
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

  // ── Sheet-level keydown: handles table 2-step deletion + ESC dismiss ────
  const handleSheetKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (selectedTableId !== null) {
      if (e.key === "Backspace") {
        // Second Backspace: delete the selected table block.
        e.preventDefault();
        dispatch({ type: "DELETE_BLOCK", nodeId: selectedTableId });
        setSelectedTableId(null);
        return;
      }
      if (e.key === "Escape") {
        // ESC: dismiss the selection ring without deleting.
        e.preventDefault();
        setSelectedTableId(null);
        return;
      }
      // Any other non-modifier key: dismiss selection.
      if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key.length === 1) {
        setSelectedTableId(null);
      }
    }
  };

  return (
    <Sheet
      open={Boolean(openId)}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent className="flex w-full flex-col gap-0 sm:!max-w-[56rem]">
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
              {/* pr-12: leaves room for SheetContent's absolute X close button (top-3 right-3 ≈ 44px) */}
              <div className="flex items-center justify-between gap-2 border-b px-4 py-1.5 pr-12">
                {/* Left: entity status chip */}
                <EntityStatusChip entityId={section.id} variant="pill" />

                {/* Right: more actions dropdown + delete */}
                <div className="flex items-center gap-1">
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
                  Using a ref-callback (setScrollEl) instead of useRef so that
                  the state flip on DOM attachment triggers a re-render and the
                  virtualizer initialises with the real element, not null. */}
              {/* data-backlog-sheet scopes block-navigation querySelectorAll to this sheet */}
              <div
                ref={setScrollEl}
                data-backlog-sheet="true"
                className="flex-1 overflow-y-auto px-12 py-10"
              >
                <div className="mx-auto max-w-2xl">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={flushTitle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        flushTitle();
                        (e.currentTarget as HTMLInputElement).blur();
                      }
                    }}
                    placeholder="Untitled"
                    aria-label="Title"
                    className="w-full border-0 bg-transparent p-0 text-3xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/40 focus:ring-0"
                  />

                  <div className="mt-8">
                    {/* VirtualBlockList: only DOM-renders visible blocks. */}
                    <VirtualBlockList
                      ids={childBlockIds}
                      render={(id) => (
                        <EditableBlock blockId={id} parentId={section.id} />
                      )}
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
  );
}
