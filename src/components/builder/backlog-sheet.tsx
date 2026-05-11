"use client";

import { Trash2 } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { useBacklogStore } from "@/services/stores";
import { EditableBlock } from "./editable-block";
import { NotionWriter } from "./notion-writer";
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
  const dispatch = useBuilderDispatch();

  // scrollRef: the overflow-y-auto container that acts as the virtual scroll
  // parent. VirtualBlockList's getScrollElement reads this ref.
  const scrollRef = useRef<HTMLDivElement | null>(null);

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
              <div className="flex items-center justify-end gap-1 border-b px-4 py-1.5">
                {section ? (
                  <EntityStatusChip entityId={section.id} variant="pill" />
                ) : null}
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
              {/* scroll parent — VirtualBlockList's getScrollElement points here */}
              {/* data-backlog-sheet scopes block-navigation querySelectorAll to this sheet */}
              <div
                ref={scrollRef}
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
                    {/* VirtualBlockList: only DOM-renders visible blocks.
                        NotionWriter sits outside the virtual container so it
                        is always accessible regardless of scroll position. */}
                    <VirtualBlockList
                      ids={childBlockIds}
                      render={(id) => (
                        <EditableBlock blockId={id} parentId={section.id} />
                      )}
                      scrollContainerRef={scrollRef}
                      estimateSize={48}
                      overscan={10}
                    />
                    <NotionWriter parentId={section.id} />
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
