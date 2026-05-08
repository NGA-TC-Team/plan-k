"use client";

import { Trash2 } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";
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
import { StatusChipMenu } from "./status-chip";

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
          <>
            <div className="flex items-center justify-end gap-1 border-b px-4 py-1.5">
              {section ? (
                <StatusChipMenu
                  status={section.status}
                  variant="pill"
                  onChange={(next) =>
                    dispatch({
                      type: "UPDATE_SECTION",
                      sectionId: section.id,
                      patch: { status: next },
                    })
                  }
                />
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
            <div className="flex-1 overflow-y-auto px-12 py-10">
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

                <div className="mt-8 space-y-1">
                  <AnimatePresence initial={false}>
                    {childBlockIds.map((id) => (
                      <EditableBlock
                        key={id}
                        blockId={id}
                        parentId={section.id}
                      />
                    ))}
                  </AnimatePresence>
                  <NotionWriter parentId={section.id} />
                </div>
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
