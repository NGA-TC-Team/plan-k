"use client";

import { GripVertical } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useContext, useEffect, useRef, useState } from "react";
import { defaultDataFor } from "@/builder/defaults";
import type { BlockEntity } from "@/builder/types/entity";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  useBuilderDispatch,
  useBuilderState,
} from "@/hooks/builder/use-builder-store.hook";
import { cn } from "@/lib/utils";
import { useAiFlashStore } from "@/services/stores";
import { BacklogSelectionContext } from "./backlog-sheet";
import { BlockKindPicker } from "./block-kind-picker";
import { matchBlockMacro } from "./block-macros";
import { BlockShell } from "./block-shell";
import { BookmarkCard } from "./blocks/bookmark-card";
import { MathBlock } from "./blocks/math-block";
import { EditableTable } from "./editable-table";
import { InlineEditor, type InlineEditorHandle } from "./inline-editor";

type Props = {
  blockId: string;
  parentId?: string;
};

// ── Block-navigation helpers ──────────────────────────────────────────────────
// Moves the caret from the current block to the previous sibling's InlineEditor
// (end position) or the next sibling's InlineEditor (start position).
//
// Strategy: querySelectorAll("[data-block-id]") scoped to the nearest
// [data-backlog-sheet] ancestor, then sort by vertical translateY so the logical
// order matches the visual order even inside an absolute-positioned virtualizer.
// Falls back to no-op when the adjacent block isn't in the DOM (virtualized,
// off-screen) — caller already called e.preventDefault() only after this returns
// true (see callers below).

// Focuses the [data-backlog-title] input within the nearest sheet root and
// places the caret at the end of the current value.
// Returns true when the input was found and focused; false otherwise.
function focusTitleInput(currentEl: HTMLElement): boolean {
  const sheetRoot = currentEl.closest<HTMLElement>("[data-backlog-sheet]");
  const titleInput = sheetRoot?.querySelector<HTMLInputElement>(
    "input[data-backlog-title='true']",
  );
  if (!titleInput) return false;
  titleInput.focus();
  const len = titleInput.value.length;
  titleInput.setSelectionRange(len, len);
  return true;
}

// Moves caret to prev block; if no prev block, falls back to the title input.
// Returns true when caret was moved (either to prev block or title).
export function moveCaretToPrevBlockOrTitle(currentBlockId: string): boolean {
  // Try standard prev-block navigation first.
  if (moveCaretToPrevBlock(currentBlockId)) return true;
  // No prev block in DOM — fall back to title input.
  const currentEl = document.querySelector<HTMLElement>(
    `[data-block-id="${CSS.escape(currentBlockId)}"]`,
  );
  if (!currentEl) return false;
  return focusTitleInput(currentEl);
}

function getSortedBlockElements(currentEl: HTMLElement): HTMLElement[] {
  // Walk up to find the sheet scroll container that owns this block.
  const sheetRoot = currentEl.closest<HTMLElement>("[data-backlog-sheet]");
  const queryRoot = sheetRoot ?? document;
  const els = Array.from(
    queryRoot.querySelectorAll<HTMLElement>("[data-block-id]"),
  );
  // Sort by visual top offset. getVirtualItems places rows with CSS translateY;
  // getBoundingClientRect().top gives the rendered vertical position regardless
  // of the positioning model used.
  els.sort(
    (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top,
  );
  return els;
}

// Returns true when the caret was moved (preventDefault should be called by
// the caller *before* invoking this — the caller checks isCaretAtStart/End
// and only invokes this when the boundary condition is met).
export function moveCaretToPrevBlock(currentBlockId: string): boolean {
  const currentEl = document.querySelector<HTMLElement>(
    `[data-block-id="${CSS.escape(currentBlockId)}"]`,
  );
  if (!currentEl) return false;

  const sorted = getSortedBlockElements(currentEl);
  const idx = sorted.indexOf(currentEl);
  if (idx <= 0) return false; // already first block

  // Walk backwards until we find a block that contains a contenteditable.
  // This skips bookmark / figure / math-block frames that have no editable child.
  for (let i = idx - 1; i >= 0; i--) {
    const candidate = sorted[i];
    if (!candidate) continue;
    const editor = candidate.querySelector<HTMLElement>(
      "[contenteditable='true']",
    );
    if (!editor) continue;
    editor.focus();
    placeCaretAtOffsetDOM(editor, Number.POSITIVE_INFINITY); // infinity → end
    return true;
  }
  return false;
}

export function moveCaretToNextBlock(currentBlockId: string): boolean {
  const currentEl = document.querySelector<HTMLElement>(
    `[data-block-id="${CSS.escape(currentBlockId)}"]`,
  );
  if (!currentEl) return false;

  const sorted = getSortedBlockElements(currentEl);
  const idx = sorted.indexOf(currentEl);
  if (idx < 0) return false;

  // Walk forwards until we find a block that contains a contenteditable.
  // table blocks expose their header cell as the first contenteditable,
  // which gives natural "enter table from top" behaviour.
  for (let i = idx + 1; i < sorted.length; i++) {
    const candidate = sorted[i];
    if (!candidate) continue;
    const editor = candidate.querySelector<HTMLElement>(
      "[contenteditable='true']",
    );
    if (!editor) continue;
    editor.focus();
    placeCaretAtOffsetDOM(editor, 0); // start
    return true;
  }

  // Fallback: no next sibling block — jump to the NotionWriter inside the same
  // sheet so ArrowDown from the last block lands in the writer.
  const sheetRoot = currentEl.closest<HTMLElement>("[data-backlog-sheet]");
  const writerEditor = sheetRoot?.querySelector<HTMLElement>(
    "[data-notion-writer='true'][contenteditable='true']",
  );
  if (writerEditor) {
    writerEditor.focus();
    placeCaretAtOffsetDOM(writerEditor, 0);
    return true;
  }
  return false;
}

// Moves the caret to the last block's editor end position within the sheet that
// contains scopeRoot. Used by NotionWriter when ArrowUp/ArrowLeft is pressed at
// the very start of the writer.
// Returns false when no editable block is found (safe no-op).
export function moveCaretToLastBlock(scopeRoot: HTMLElement): boolean {
  const sheetRoot =
    scopeRoot.closest<HTMLElement>("[data-backlog-sheet]") ?? scopeRoot;
  const all = Array.from(
    sheetRoot.querySelectorAll<HTMLElement>("[data-block-id]"),
  );
  if (all.length === 0) return false;
  // Sort by visual top so the "last" block is the one rendered lowest on screen.
  all.sort(
    (a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top,
  );
  // Iterate from last to first; skip blocks without a contenteditable child
  // (e.g., link-card, math-block, figure).
  for (let i = all.length - 1; i >= 0; i--) {
    const editor = all[i]?.querySelector<HTMLElement>(
      "[contenteditable='true']",
    );
    if (!editor) continue;
    editor.focus();
    placeCaretAtOffsetDOM(editor, Number.POSITIVE_INFINITY); // end
    return true;
  }
  return false;
}

// ── Merge helper ──────────────────────────────────────────────────────────────
// Focuses the InlineEditor inside a BlockFrame that owns the given blockId,
// then places the caret at charOffset (character position in plain text).
// Falls back silently when the block is not yet in the DOM (virtualised, offscreen).
function focusBlockAtOffset(blockId: string, charOffset: number): void {
  // RAF ensures the DOM has updated after any preceding dispatch (UPDATE_BLOCK).
  requestAnimationFrame(() => {
    const frame = document.querySelector(
      `[data-block-id="${CSS.escape(blockId)}"]`,
    );
    if (!frame) return;
    // The InlineEditor contenteditable div is the first [contenteditable] child.
    const editor = frame.querySelector<HTMLElement>("[contenteditable='true']");
    if (!editor) return;
    editor.focus();
    // placeCaretAtOffset is a DOM utility exported from inline-editor.tsx; import
    // it via the InlineEditorHandle's placeCaretAt or directly from the module.
    // Here we call the DOM util directly to avoid ref coupling.
    placeCaretAtOffsetDOM(editor, charOffset);
  });
}

// Walks text nodes to place the caret at charOffset — mirrors the exported
// placeCaretAtOffset in inline-editor.tsx but operates on any HTMLElement so
// we don't need an InlineEditorHandle reference in this module.
// Pass Number.POSITIVE_INFINITY to place caret at the very end of content.
// Exported so that notion-writer.tsx can reuse it without reimplementing.
export function placeCaretAtOffsetDOM(
  el: HTMLElement,
  charOffset: number,
): void {
  const sel = window.getSelection();
  if (!sel) return;
  // Fast-path: infinity means "go to end".
  if (!Number.isFinite(charOffset)) {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    return;
  }
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let accumulated = 0;
  let node = walker.nextNode() as Text | null;
  while (node) {
    const len = node.length;
    if (accumulated + len >= charOffset) {
      const range = document.createRange();
      range.setStart(node, charOffset - accumulated);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    accumulated += len;
    node = walker.nextNode() as Text | null;
  }
  // Past end — place at content end.
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

// Hook: returns the prev sibling block id for the given blockId within its
// parent's children array. Returns null when there is no prev sibling.
function usePrevSiblingId(blockId: string): string | null {
  return useBuilderState((s) => {
    const block = s.state.blocks[blockId];
    if (!block) return null;
    const siblings = s.state.children[block.parentId] ?? [];
    const idx = siblings.indexOf(blockId);
    if (idx <= 0) return null;
    return siblings[idx - 1] ?? null;
  });
}

// ── mergeIntoBlock ────────────────────────────────────────────────────────────
// Merges `currentMd` into `prevBlock`'s text field based on kind.
// After dispatching UPDATE_BLOCK, schedules a caret placement at the junction.
//
// Table / non-text blocks: triggers table selected state (first-stage highlight)
// instead of merging. Returns true if a merge was dispatched; false otherwise.
function mergeIntoBlock(
  prevBlock: BlockEntity,
  currentMd: string,
  dispatch: ReturnType<typeof useBuilderDispatch>,
  setSelectedTableId: (id: string | null) => void,
): boolean {
  switch (prevBlock.kind) {
    case "paragraph": {
      const prevMd = (prevBlock.data.markdown as string) ?? "";
      const prevLen = prevMd.length;
      dispatch({
        type: "UPDATE_BLOCK",
        nodeId: prevBlock.id,
        patch: { data: { ...prevBlock.data, markdown: prevMd + currentMd } },
      });
      focusBlockAtOffset(prevBlock.id, prevLen);
      return true;
    }
    case "heading": {
      const prevText = (prevBlock.data.text as string) ?? "";
      const prevLen = prevText.length;
      dispatch({
        type: "UPDATE_BLOCK",
        nodeId: prevBlock.id,
        patch: { data: { ...prevBlock.data, text: prevText + currentMd } },
      });
      focusBlockAtOffset(prevBlock.id, prevLen);
      return true;
    }
    case "blockquote": {
      const prevText = (prevBlock.data.text as string) ?? "";
      const prevLen = prevText.length;
      dispatch({
        type: "UPDATE_BLOCK",
        nodeId: prevBlock.id,
        patch: { data: { ...prevBlock.data, text: prevText + currentMd } },
      });
      focusBlockAtOffset(prevBlock.id, prevLen);
      return true;
    }
    case "code-block": {
      const prevCode = (prevBlock.data.code as string) ?? "";
      const prevLen = prevCode.length;
      // Join with a newline when the prev code has content.
      const joined =
        prevCode.length > 0 ? `${prevCode}\n${currentMd}` : currentMd;
      dispatch({
        type: "UPDATE_BLOCK",
        nodeId: prevBlock.id,
        patch: { data: { ...prevBlock.data, code: joined } },
      });
      focusBlockAtOffset(prevBlock.id, prevLen);
      return true;
    }
    case "bullet-list":
    case "numbered-list": {
      const items = ((prevBlock.data.items as string[]) ?? []).slice();
      if (items.length === 0) {
        items.push(currentMd);
      } else {
        const lastIdx = items.length - 1;
        items[lastIdx] = (items[lastIdx] ?? "") + currentMd;
      }
      dispatch({
        type: "UPDATE_BLOCK",
        nodeId: prevBlock.id,
        patch: { data: { ...prevBlock.data, items } },
      });
      // Focus the last item — BlockFrame-based focus is not directly applicable
      // for list items (they render their own InlineEditors without data-block-id
      // per item). We focus the block frame end as best-effort.
      focusBlockAtOffset(prevBlock.id, 0);
      return true;
    }
    case "checklist": {
      const items = (
        (prevBlock.data.items as Array<{ text: string; done: boolean }>) ?? []
      ).slice();
      if (items.length === 0) {
        items.push({ text: currentMd, done: false });
      } else {
        const lastIdx = items.length - 1;
        const last = items[lastIdx];
        if (last) items[lastIdx] = { ...last, text: last.text + currentMd };
      }
      dispatch({
        type: "UPDATE_BLOCK",
        nodeId: prevBlock.id,
        patch: { data: { ...prevBlock.data, items } },
      });
      focusBlockAtOffset(prevBlock.id, 0);
      return true;
    }
    case "table":
      // Table: enter outer-selected state (2-step delete stage 1) instead of merge.
      setSelectedTableId(prevBlock.id);
      return false;
    default:
      // Non-text prev block (link-card, figure, math-block, etc.): caret jump only.
      // The current block is preserved; we just move focus to end of prev block.
      focusBlockAtOffset(prevBlock.id, 0);
      return false;
  }
}

// Renders a block inline-editably for kinds that have a primary text/markdown
// field. Kinds we don't yet support fall back to the existing BlockShell
// (double-click → side-panel form editor).
export function EditableBlock({ blockId }: Props) {
  const block = useBuilderState((s) => s.state.blocks[blockId]);
  // Read table outer-selection state from BacklogSheet context (may be null
  // when this component is rendered outside a BacklogSheet, e.g. on a screen).
  const { selectedTableId } = useContext(BacklogSelectionContext);

  if (!block) return null;
  switch (block.kind) {
    case "paragraph":
      return <ParagraphLine block={block} />;
    case "heading":
      return <HeadingLine block={block} />;
    case "blockquote":
      return <QuoteLine block={block} />;
    case "code-block":
      return <CodeLine block={block} />;
    case "bullet-list":
    case "numbered-list":
      return <ListLine block={block} />;
    case "checklist":
      return <ChecklistLine block={block} />;
    case "link-card":
      return (
        <BlockFrame blockId={blockId}>
          <BookmarkCard block={block} />
        </BlockFrame>
      );
    case "table":
      return (
        // layout animation disabled for table blocks — cell focus events would
        // trigger constant re-layout causing visual jitter (plan note §PR-2).
        <BlockFrame blockId={blockId} disableLayoutAnim>
          <EditableTable
            block={block}
            outerSelected={selectedTableId === blockId}
          />
        </BlockFrame>
      );
    case "math-block":
      return (
        // layout animation disabled — mode toggle between editing/preview
        // causes height changes that would produce layout jump.
        <BlockFrame blockId={blockId} disableLayoutAnim>
          <MathBlock block={block} />
        </BlockFrame>
      );
    default:
      return <BlockShell blockId={blockId} />;
  }
}

function BlockFrame({
  blockId,
  children,
  // disableLayoutAnim is kept in the public API for call-site compatibility
  // (table, math-block) but no longer controls the layout prop — layout is
  // always false because blocks live inside absolute-positioned virtual rows.
  disableLayoutAnim: _disableLayoutAnim = false,
}: {
  blockId: string;
  children: React.ReactNode;
  /** Kept for API compatibility. layout is always false in virtual rows. */
  disableLayoutAnim?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const isFlashing = useAiFlashStore((s) => s.flashedIds.has(blockId));
  return (
    <motion.div
      // layout is always off: blocks are rendered inside an absolute-positioned
      // virtual row (position: absolute + translateY). Framer Motion's layout
      // tracking would read incorrect coordinates and produce visible jumps.
      // The AI flash (opacity/blur) and enter (opacity/y) animations are kept.
      layout={false}
      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
      animate={
        reduceMotion
          ? { opacity: 1, y: 0 }
          : isFlashing
            ? {
                opacity: [1, 0.7, 1],
                filter: ["blur(0px)", "blur(6px)", "blur(0px)"],
                y: 0,
              }
            : { opacity: 1, y: 0, filter: "blur(0px)" }
      }
      transition={{
        duration: reduceMotion ? 0 : isFlashing ? 0.55 : 0.15,
        ease: "easeOut",
      }}
      // data-block-id allows mergeIntoBlock() and DOM-walk navigation to locate
      // a specific block's InlineEditor by querying '[data-block-id="<id>"]'.
      data-block-id={blockId}
      className="group/eb relative py-0.5"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -left-5 top-1.5 flex text-muted-foreground/40"
      >
        <GripVertical className="size-3.5" />
      </span>
      {children}
    </motion.div>
  );
}

// Stable empty array for Zustand selectors — avoids "getSnapshot should be
// cached" warning when a parentId has no children entry yet.
const EMPTY_SIBLINGS: string[] = [];

// Placeholder shown only when a paragraph block is focused and empty.
// Module-level constant avoids new string reference on every render.
const PARAGRAPH_FOCUSED_PLACEHOLDER =
  "Type, '/' for blocks, '#' for heading, '- ' for bullet…";

function ParagraphLine({ block }: { block: BlockEntity }) {
  const dispatch = useBuilderDispatch();
  const value = (block.data.markdown as string) ?? "";
  const handleRef = useRef<InlineEditorHandle | null>(null);
  const prevSiblingId = usePrevSiblingId(block.id);
  const prevBlock = useBuilderState((s) =>
    prevSiblingId ? s.state.blocks[prevSiblingId] : undefined,
  );
  const { setSelectedTableId } = useContext(BacklogSelectionContext);

  // Insertion index for a new paragraph right after this block.
  // Mirrors the HeadingLine pattern — uses EMPTY_SIBLINGS constant to avoid
  // a fresh array reference on every render (Zustand getSnapshot stability).
  const insertAfterIndex = useBuilderState((s) => {
    const siblings = s.state.children[block.parentId] ?? EMPTY_SIBLINGS;
    const selfIdx = siblings.indexOf(block.id);
    // selfIdx === -1 race guard: fallback to 0 so INSERT_BLOCK still fires.
    return selfIdx === -1 ? 0 : selfIdx + 1;
  });

  // planKind → platform: mirrors insert-slot.tsx pattern.
  // Primitive selector (string | null) is snapshot-safe without useShallow.
  const planKind = useBuilderState(
    (s) => Object.values(s.state.plans)[0]?.kind ?? null,
  );
  const platform: "mobile" | "web" = planKind === "mobile" ? "mobile" : "web";

  // Track focus state so we can show a richer placeholder on empty blocks.
  const [isFocused, setIsFocused] = useState(false);

  // ── Slash menu state ──────────────────────────────────────────────────────
  // Opens when the committed value is empty ("") and the first character typed
  // is "/". Closed by picker selection, Esc, or outside click (Popover default).
  const [slashOpen, setSlashOpen] = useState(false);

  // isEmpty is derived from the committed value — no extra state needed.
  const isEmpty = value.length === 0;

  // Show placeholder only when focused and empty. Passing undefined suppresses
  // the placeholder entirely (InlineEditor: showPlaceholder = isEmpty && !!placeholder).
  const dynamicPlaceholder =
    isEmpty && isFocused ? PARAGRAPH_FOCUSED_PLACEHOLDER : undefined;

  const commit = (md: string) => {
    if (md === value) return;
    dispatch({
      type: "UPDATE_BLOCK",
      nodeId: block.id,
      patch: { data: { ...block.data, markdown: md } },
    });
  };

  return (
    <BlockFrame blockId={block.id}>
      {/* Popover anchor wraps the InlineEditor so the popup positions relative
          to the paragraph row. The trigger is a zero-size invisible element;
          open state is driven programmatically via slashOpen. */}
      <Popover open={slashOpen} onOpenChange={(next) => setSlashOpen(next)}>
        <PopoverTrigger className="sr-only" aria-label="블록 종류 선택 메뉴" />
        <PopoverContent
          className="w-72 max-h-[60vh] overflow-y-auto p-1 outline-none"
          sideOffset={6}
          side="bottom"
          align="start"
        >
          <BlockKindPicker
            // block.context is typed as optional in BlockEntity; backlog paragraphs
            // always carry "docs" (seeded explicitly). Fallback guards against
            // a hypothetical undefined — "docs" is the safest default here.
            context={block.context ?? "docs"}
            platform={platform}
            autoFocus={slashOpen}
            onPick={(kind) => {
              // Replace current paragraph with the chosen block kind.
              // Clears the "/" character that opened the menu via data reset.
              dispatch({
                type: "UPDATE_BLOCK",
                nodeId: block.id,
                patch: {
                  kind,
                  data: defaultDataFor(kind),
                },
              });
              setSlashOpen(false);
              // Focus the converted block after React commits.
              requestAnimationFrame(() => {
                focusBlockAtOffset(block.id, 0);
              });
            }}
          />
        </PopoverContent>
      </Popover>
      <InlineEditor
        ref={handleRef}
        value={value}
        onFocus={() => setIsFocused(true)}
        onBlur={(md) => {
          setIsFocused(false);
          commit(md);
        }}
        onChange={(md) => {
          // ── Slash menu: only when committed value is empty and first char is "/" ──
          // Guard: value.length === 0 ensures we are in a blank paragraph.
          // md === "/" means the slash is the only character typed so far.
          // "abc/" → value.length > 0 so the menu never fires for mid-content "/".
          if (value.length === 0 && md === "/") {
            setSlashOpen(true);
            return;
          }

          // ── Macro detection: only when current committed value is empty ──
          // Guard: skip when value is non-empty so we never transform blocks
          // that already have text content. The block is only "empty" when the
          // last-committed value is ""; mid-typing the md will grow from "".
          if (value.length !== 0) return;

          const macro = matchBlockMacro(md);
          if (!macro) return;

          // Race guard: block must still exist in state at dispatch time.
          // UPDATE_BLOCK reducer returns null when the nodeId is not found,
          // so the dispatch is safely a no-op in that case. We still guard
          // here to avoid firing the RAF focus after a stale block.
          dispatch({
            type: "UPDATE_BLOCK",
            nodeId: block.id,
            patch: { kind: macro.kind, data: macro.data },
          });

          // Focus the converted block's first contenteditable after the DOM
          // has updated. RAF ensures the React commit has finished.
          requestAnimationFrame(() => {
            focusBlockAtOffset(block.id, 0);
          });
        }}
        placeholder={dynamicPlaceholder}
        onKeyDown={(e, _md) => {
          const md = _md;

          // ── Esc: close slash menu if open ─────────────────────────────────
          // Prevent the sheet-level Esc handler from also triggering.
          if (e.key === "Escape" && slashOpen) {
            e.stopPropagation();
            setSlashOpen(false);
            return;
          }

          // ── Arrow navigation: cross-block caret movement ─────────────────
          // Alt+Arrow is reserved for list item reorder (PR-A) — skip here.
          // preventDefault only when moveCaretTo* succeeds (adjacent block in DOM).
          if (!e.altKey) {
            if (
              (e.key === "ArrowUp" || e.key === "ArrowLeft") &&
              handleRef.current?.isCaretAtStart()
            ) {
              // Try prev block; fallback to title input if at first block.
              if (moveCaretToPrevBlockOrTitle(block.id)) e.preventDefault();
              return;
            }
            if (
              (e.key === "ArrowDown" || e.key === "ArrowRight") &&
              handleRef.current?.isCaretAtEnd()
            ) {
              if (moveCaretToNextBlock(block.id)) e.preventDefault();
              return;
            }
          }
          // ── Enter: insert a new paragraph block right after this one ────
          // Shift+Enter falls through to native (line break inside paragraph).
          // isComposing guard prevents firing mid-IME (Korean, Japanese, etc.).
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            commit(md);
            const newBlock: BlockEntity = {
              id: crypto.randomUUID(),
              parentId: block.parentId,
              kind: "paragraph",
              context: block.context,
              data: { ...defaultDataFor("paragraph"), markdown: "" },
            };
            dispatch({
              type: "INSERT_BLOCK",
              parentId: block.parentId,
              block: newBlock,
              index: insertAfterIndex,
            });
            focusBlockAtOffset(newBlock.id, 0);
            return;
          }
          // ── Backspace: delete / merge ─────────────────────────────────────
          if (e.key === "Backspace") {
            // isEmpty: trim strips browser-injected trailing "\n" from <br>
            const isEmpty = md.replace(/\n/g, "").trim().length === 0;
            if (isEmpty) {
              // Empty block: move caret to prev block (or title) before delete.
              if (prevBlock?.kind === "table") {
                e.preventDefault();
                moveCaretToPrevBlockOrTitle(block.id);
                setSelectedTableId(prevBlock.id);
                dispatch({ type: "DELETE_BLOCK", nodeId: block.id });
                return;
              }
              e.preventDefault();
              moveCaretToPrevBlockOrTitle(block.id);
              dispatch({ type: "DELETE_BLOCK", nodeId: block.id });
              return;
            }
            // Non-empty block at caret-start: merge into prev sibling.
            if (handleRef.current?.isCaretAtStart() && prevBlock) {
              e.preventDefault();
              mergeIntoBlock(prevBlock, md, dispatch, setSelectedTableId);
              dispatch({ type: "DELETE_BLOCK", nodeId: block.id });
            }
          }
        }}
        inputClassName="text-[15px] leading-relaxed"
      />
    </BlockFrame>
  );
}

function HeadingLine({ block }: { block: BlockEntity }) {
  const dispatch = useBuilderDispatch();
  const level = (block.data.level as 1 | 2 | 3) ?? 1;
  const value = (block.data.text as string) ?? "";
  const handleRef = useRef<InlineEditorHandle | null>(null);
  const prevSiblingId = usePrevSiblingId(block.id);
  const prevBlock = useBuilderState((s) =>
    prevSiblingId ? s.state.blocks[prevSiblingId] : undefined,
  );
  const { setSelectedTableId } = useContext(BacklogSelectionContext);

  // Compute the insertion index for a new block right after this heading.
  // Hoisted to module-level EMPTY_SIBLINGS constant to keep getSnapshot stable
  // and prevent the "infinite loop" Zustand warning.
  const insertAfterIndex = useBuilderState((s) => {
    const siblings = s.state.children[block.parentId] ?? EMPTY_SIBLINGS;
    const selfIdx = siblings.indexOf(block.id);
    // Guard: indexOf returns -1 when block isn't found (race during deletion).
    // Fallback to 0 so the new block is still inserted rather than silently dropped.
    return selfIdx === -1 ? 0 : selfIdx + 1;
  });

  const commit = (md: string) => {
    if (md === value) return;
    dispatch({
      type: "UPDATE_BLOCK",
      nodeId: block.id,
      patch: { data: { ...block.data, text: md } },
    });
  };

  // Mirror HeaderDetail display sizes exactly to prevent edit-mode reflow.
  const sizeClass =
    level === 1
      ? "text-[28px] leading-tight font-bold tracking-display-lg"
      : level === 2
        ? "text-[22px] leading-tight font-semibold tracking-headline"
        : "text-[18px] leading-snug font-semibold tracking-headline";

  return (
    <BlockFrame blockId={block.id}>
      <InlineEditor
        ref={handleRef}
        value={value}
        onBlur={commit}
        placeholder={`Heading ${level}`}
        inputClassName={sizeClass}
        onKeyDown={(e, _md) => {
          const md = _md;
          // ── Arrow navigation ──────────────────────────────────────────────
          if (!e.altKey) {
            if (
              (e.key === "ArrowUp" || e.key === "ArrowLeft") &&
              handleRef.current?.isCaretAtStart()
            ) {
              // Fallback to title input when at first block.
              if (moveCaretToPrevBlockOrTitle(block.id)) e.preventDefault();
              return;
            }
            if (
              (e.key === "ArrowDown" || e.key === "ArrowRight") &&
              handleRef.current?.isCaretAtEnd()
            ) {
              if (moveCaretToNextBlock(block.id)) e.preventDefault();
              return;
            }
          }
          // ── Enter: insert a new paragraph block right after this heading ──
          // Shift+Enter falls through to native (line break inside heading).
          // isComposing guard prevents firing mid-IME composition (Korean etc.).
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            // Flush any in-flight text before inserting the new block.
            commit(md);
            const newBlock: BlockEntity = {
              id: crypto.randomUUID(),
              parentId: block.parentId,
              kind: "paragraph",
              context: block.context,
              data: { ...defaultDataFor("paragraph"), markdown: "" },
            };
            dispatch({
              type: "INSERT_BLOCK",
              parentId: block.parentId,
              block: newBlock,
              index: insertAfterIndex,
            });
            // RAF: wait for React to commit the new block to the DOM before focusing.
            focusBlockAtOffset(newBlock.id, 0);
            return;
          }
          // ── Backspace ─────────────────────────────────────────────────────
          if (e.key === "Backspace") {
            // isEmpty: trim strips browser-injected trailing "\n" from <br>
            const isEmpty = md.replace(/\n/g, "").trim().length === 0;
            if (isEmpty) {
              // Empty heading: move caret to prev block (or title) before delete.
              if (prevBlock?.kind === "table") {
                e.preventDefault();
                moveCaretToPrevBlockOrTitle(block.id);
                setSelectedTableId(prevBlock.id);
                dispatch({ type: "DELETE_BLOCK", nodeId: block.id });
                return;
              }
              e.preventDefault();
              moveCaretToPrevBlockOrTitle(block.id);
              dispatch({ type: "DELETE_BLOCK", nodeId: block.id });
              return;
            }
            if (handleRef.current?.isCaretAtStart() && prevBlock) {
              e.preventDefault();
              mergeIntoBlock(prevBlock, md, dispatch, setSelectedTableId);
              dispatch({ type: "DELETE_BLOCK", nodeId: block.id });
            }
          }
        }}
      />
    </BlockFrame>
  );
}

function QuoteLine({ block }: { block: BlockEntity }) {
  const dispatch = useBuilderDispatch();
  const value = (block.data.text as string) ?? "";
  const handleRef = useRef<InlineEditorHandle | null>(null);
  const prevSiblingId = usePrevSiblingId(block.id);
  const prevBlock = useBuilderState((s) =>
    prevSiblingId ? s.state.blocks[prevSiblingId] : undefined,
  );
  const { setSelectedTableId } = useContext(BacklogSelectionContext);

  const commit = (md: string) => {
    if (md === value) return;
    dispatch({
      type: "UPDATE_BLOCK",
      nodeId: block.id,
      patch: { data: { ...block.data, text: md } },
    });
  };
  return (
    <BlockFrame blockId={block.id}>
      <div className="border-l-4 border-muted-foreground/40 pl-3 italic">
        <InlineEditor
          ref={handleRef}
          value={value}
          onBlur={commit}
          placeholder="Quote"
          inputClassName="text-[15px]"
          onKeyDown={(e, _md) => {
            const md = _md;
            // ── Arrow navigation ────────────────────────────────────────────
            if (!e.altKey) {
              if (
                (e.key === "ArrowUp" || e.key === "ArrowLeft") &&
                handleRef.current?.isCaretAtStart()
              ) {
                if (moveCaretToPrevBlockOrTitle(block.id)) e.preventDefault();
                return;
              }
              if (
                (e.key === "ArrowDown" || e.key === "ArrowRight") &&
                handleRef.current?.isCaretAtEnd()
              ) {
                if (moveCaretToNextBlock(block.id)) e.preventDefault();
                return;
              }
            }
            // ── Backspace ───────────────────────────────────────────────────
            if (e.key === "Backspace") {
              // isEmpty: trim strips browser-injected trailing "\n" from <br>
              const isEmpty = md.replace(/\n/g, "").trim().length === 0;
              if (isEmpty) {
                // Empty quote: move caret to prev block (or title) before delete.
                if (prevBlock?.kind === "table") {
                  e.preventDefault();
                  moveCaretToPrevBlockOrTitle(block.id);
                  setSelectedTableId(prevBlock.id);
                  dispatch({ type: "DELETE_BLOCK", nodeId: block.id });
                  return;
                }
                e.preventDefault();
                moveCaretToPrevBlockOrTitle(block.id);
                dispatch({ type: "DELETE_BLOCK", nodeId: block.id });
                return;
              }
              if (handleRef.current?.isCaretAtStart() && prevBlock) {
                e.preventDefault();
                mergeIntoBlock(prevBlock, md, dispatch, setSelectedTableId);
                dispatch({ type: "DELETE_BLOCK", nodeId: block.id });
              }
            }
          }}
        />
      </div>
    </BlockFrame>
  );
}

function CodeLine({ block }: { block: BlockEntity }) {
  const dispatch = useBuilderDispatch();
  const value = (block.data.code as string) ?? "";
  const handleRef = useRef<InlineEditorHandle | null>(null);
  const prevSiblingId = usePrevSiblingId(block.id);
  const prevBlock = useBuilderState((s) =>
    prevSiblingId ? s.state.blocks[prevSiblingId] : undefined,
  );
  const { setSelectedTableId } = useContext(BacklogSelectionContext);

  const commit = (md: string) => {
    if (md === value) return;
    dispatch({
      type: "UPDATE_BLOCK",
      nodeId: block.id,
      patch: { data: { ...block.data, code: md } },
    });
  };
  return (
    <BlockFrame blockId={block.id}>
      <div className="rounded-md bg-muted px-3 py-2 font-mono text-sm">
        <InlineEditor
          ref={handleRef}
          value={value}
          onBlur={commit}
          multiline
          toolbar={false}
          placeholder="Code"
          inputClassName="font-mono text-sm"
          onKeyDown={(e, _md) => {
            const md = _md;
            // ── Arrow navigation ────────────────────────────────────────────
            // code-block is multiline; only ArrowLeft/ArrowRight cross-block;
            // ArrowUp/ArrowDown are intentionally left to native inside multiline.
            if (!e.altKey) {
              if (
                e.key === "ArrowLeft" &&
                handleRef.current?.isCaretAtStart()
              ) {
                if (moveCaretToPrevBlockOrTitle(block.id)) e.preventDefault();
                return;
              }
              if (e.key === "ArrowRight" && handleRef.current?.isCaretAtEnd()) {
                if (moveCaretToNextBlock(block.id)) e.preventDefault();
                return;
              }
            }
            // ── Backspace ───────────────────────────────────────────────────
            if (e.key === "Backspace") {
              // isEmpty: trim strips browser-injected trailing "\n" from <br>
              const isEmpty = md.replace(/\n/g, "").trim().length === 0;
              if (isEmpty) {
                // Empty code block: move caret to prev block (or title) before delete.
                if (prevBlock?.kind === "table") {
                  e.preventDefault();
                  moveCaretToPrevBlockOrTitle(block.id);
                  setSelectedTableId(prevBlock.id);
                  dispatch({ type: "DELETE_BLOCK", nodeId: block.id });
                  return;
                }
                e.preventDefault();
                moveCaretToPrevBlockOrTitle(block.id);
                dispatch({ type: "DELETE_BLOCK", nodeId: block.id });
                return;
              }
              if (handleRef.current?.isCaretAtStart() && prevBlock) {
                e.preventDefault();
                mergeIntoBlock(prevBlock, md, dispatch, setSelectedTableId);
                dispatch({ type: "DELETE_BLOCK", nodeId: block.id });
              }
            }
          }}
        />
      </div>
    </BlockFrame>
  );
}

function ListLine({ block }: { block: BlockEntity }) {
  const dispatch = useBuilderDispatch();
  const items = ((block.data.items as string[]) ?? []).slice();
  const ordered = block.kind === "numbered-list";
  // Tracks which item index should receive autoFocus after a split.
  // Initialise to 0 when the block mounts with a single empty item
  // (slash-menu or markdown-shortcut creation) so the first item gets focus.
  const isFreshBlock = items.length === 1 && items[0] === "";
  const [pendingFocusIdx, setPendingFocusIdx] = useState<number | null>(
    isFreshBlock ? 0 : null,
  );
  // Tracks where the caret should land when a new item gains autoFocus via
  // arrow-key navigation (prev item → 'end', next item → 'start').
  const [pendingFocusCaret, setPendingFocusCaret] = useState<
    "start" | "end" | null
  >(null);
  const prevSiblingId = usePrevSiblingId(block.id);
  const prevBlock = useBuilderState((s) =>
    prevSiblingId ? s.state.blocks[prevSiblingId] : undefined,
  );
  const { setSelectedTableId } = useContext(BacklogSelectionContext);

  // Reset pendingFocusIdx one animation frame after the focused item mounts.
  // This prevents the flag from persisting across unrelated re-renders.
  useEffect(() => {
    if (pendingFocusIdx === null) return;
    const raf = requestAnimationFrame(() => {
      setPendingFocusIdx(null);
      setPendingFocusCaret(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [pendingFocusIdx]);

  // Focus the item at idx and place caret at the given position.
  // Used by arrow-key handlers to move caret between list items.
  const focusItemAt = (idx: number, caret: "start" | "end") => {
    setPendingFocusIdx(idx);
    setPendingFocusCaret(caret);
  };

  const updateItem = (idx: number, md: string) => {
    if (items[idx] === md) return;
    const next = items.slice();
    next[idx] = md;
    dispatch({
      type: "UPDATE_BLOCK",
      nodeId: block.id,
      patch: { data: { ...block.data, items: next } },
    });
  };

  const splitAt = (idx: number) => {
    const next = [...items.slice(0, idx + 1), "", ...items.slice(idx + 1)];
    dispatch({
      type: "UPDATE_BLOCK",
      nodeId: block.id,
      patch: { data: { ...block.data, items: next } },
    });
    // New item inserted below: focus at start of newly created item.
    focusItemAt(idx + 1, "start");
  };

  const removeAt = (idx: number) => {
    if (items.length <= 1) {
      dispatch({ type: "DELETE_BLOCK", nodeId: block.id });
      return;
    }
    const next = items.filter((_, i) => i !== idx);
    dispatch({
      type: "UPDATE_BLOCK",
      nodeId: block.id,
      patch: { data: { ...block.data, items: next } },
    });
  };

  // Merge item at idx into the item at idx-1 (same-list merge).
  // Used when caret is at the start of a non-first item and Backspace is pressed.
  const mergeItemIntoAbove = (idx: number, md: string) => {
    if (idx === 0) return; // guard: use onBackspaceStart for first item
    const next = items.slice();
    next[idx - 1] = (next[idx - 1] ?? "") + md;
    next.splice(idx, 1);
    dispatch({
      type: "UPDATE_BLOCK",
      nodeId: block.id,
      patch: { data: { ...block.data, items: next } },
    });
    // Focus the merged-into item at the junction (end of what was already there).
    focusItemAt(idx - 1, "end");
  };

  // First-item Backspace with content: merge first item text into prev block.
  const handleFirstItemBackspaceStart = (md: string) => {
    if (!prevBlock) return;
    const merged = mergeIntoBlock(prevBlock, md, dispatch, setSelectedTableId);
    if (merged) {
      // Remove first item from this list (or delete the whole list if only 1).
      if (items.length <= 1) {
        dispatch({ type: "DELETE_BLOCK", nodeId: block.id });
      } else {
        const next = items.slice(1);
        dispatch({
          type: "UPDATE_BLOCK",
          nodeId: block.id,
          patch: { data: { ...block.data, items: next } },
        });
      }
    }
  };

  // freshValue: the in-editor text at the moment Alt+Arrow fires.
  // Supplying it avoids relying on onBlur to flush before the move dispatch,
  // which would otherwise drop the last keystroke (race condition).
  const moveItem = (idx: number, dir: -1 | 1, freshValue?: string) => {
    const newIdx = idx + dir;
    // Boundary guard: no-op when already at first or last position.
    if (newIdx < 0 || newIdx > items.length - 1) return;
    const next = items.slice();
    // Patch idx slot with the live editor value before swapping so the
    // in-flight text is never lost even if onBlur hasn't fired yet.
    if (freshValue !== undefined) next[idx] = freshValue;
    // splice-based move: remove from current position, insert at new position.
    const [removed] = next.splice(idx, 1);
    next.splice(newIdx, 0, removed);
    dispatch({
      type: "UPDATE_BLOCK",
      nodeId: block.id,
      patch: { data: { ...block.data, items: next } },
    });
    // Keep caret on the moved item after re-render (preserve current caret side).
    focusItemAt(newIdx, "end");
  };

  return (
    <BlockFrame blockId={block.id}>
      <ul className={cn("space-y-0.5", ordered ? "list-none" : "list-none")}>
        {items.length === 0 ? (
          <ListItem
            ordered={ordered}
            index={0}
            value=""
            autoFocus={pendingFocusIdx === 0}
            autoFocusCaret={pendingFocusCaret ?? "end"}
            onCommit={(md) => updateItem(0, md)}
            onEnter={() => splitAt(0)}
            onBackspaceEmpty={() => removeAt(0)}
            onBackspaceStart={(md) => handleFirstItemBackspaceStart(md)}
            onMergeIntoAbove={undefined}
            onMoveUp={(fresh) => moveItem(0, -1, fresh)}
            onMoveDown={(fresh) => moveItem(0, 1, fresh)}
            onArrowPrevBlock={() => moveCaretToPrevBlockOrTitle(block.id)}
            onArrowNextBlock={() => moveCaretToNextBlock(block.id)}
            onArrowPrevItem={undefined}
            onArrowNextItem={undefined}
            isFirstItem
            isLastItem
          />
        ) : (
          items.map((item, idx) => (
            <ListItem
              key={`${block.id}-${idx}`}
              ordered={ordered}
              index={idx}
              value={item}
              autoFocus={pendingFocusIdx === idx}
              autoFocusCaret={pendingFocusCaret ?? "end"}
              onCommit={(md) => updateItem(idx, md)}
              onEnter={() => splitAt(idx)}
              onBackspaceEmpty={() => removeAt(idx)}
              onBackspaceStart={
                idx === 0
                  ? (md) => handleFirstItemBackspaceStart(md)
                  : undefined
              }
              onMergeIntoAbove={
                idx > 0 ? (md) => mergeItemIntoAbove(idx, md) : undefined
              }
              onMoveUp={(fresh) => moveItem(idx, -1, fresh)}
              onMoveDown={(fresh) => moveItem(idx, 1, fresh)}
              onArrowPrevBlock={() => moveCaretToPrevBlockOrTitle(block.id)}
              onArrowNextBlock={() => moveCaretToNextBlock(block.id)}
              onArrowPrevItem={
                idx > 0 ? () => focusItemAt(idx - 1, "end") : undefined
              }
              onArrowNextItem={
                idx < items.length - 1
                  ? () => focusItemAt(idx + 1, "start")
                  : undefined
              }
              isFirstItem={idx === 0}
              isLastItem={idx === items.length - 1}
            />
          ))
        )}
      </ul>
    </BlockFrame>
  );
}

function ListItem({
  ordered,
  index,
  value,
  autoFocus = false,
  autoFocusCaret = "end",
  onCommit,
  onEnter,
  onBackspaceEmpty,
  onBackspaceStart,
  onMergeIntoAbove,
  onMoveUp,
  onMoveDown,
  onArrowPrevBlock,
  onArrowNextBlock,
  onArrowPrevItem,
  onArrowNextItem,
  isFirstItem = false,
  isLastItem = false,
}: {
  ordered: boolean;
  index: number;
  value: string;
  autoFocus?: boolean;
  /** Where to place the caret when autoFocus triggers (default 'end'). */
  autoFocusCaret?: "start" | "end";
  onCommit: (md: string) => void;
  onEnter: () => void;
  onBackspaceEmpty: () => void;
  /** Called when caret is at start of first item (idx===0) and md has content. */
  onBackspaceStart?: (md: string) => void;
  /** Called when caret is at start of a non-first item (idx>0) and md has content. */
  onMergeIntoAbove?: (md: string) => void;
  // freshValue: live in-editor text passed to prevent stale-items race.
  onMoveUp: (freshValue: string) => void;
  onMoveDown: (freshValue: string) => void;
  /** Move caret to prev sibling block (called when first item caret at start).
   *  Returns true when the adjacent block was found and caret moved. */
  onArrowPrevBlock: () => boolean;
  /** Move caret to next sibling block (called when last item caret at end).
   *  Returns true when the adjacent block was found and caret moved. */
  onArrowNextBlock: () => boolean;
  /** Move caret to previous item within this list (ArrowUp on non-first item). */
  onArrowPrevItem?: () => void;
  /** Move caret to next item within this list (ArrowDown on non-last item). */
  onArrowNextItem?: () => void;
  /** Whether this is the first item in the list (enables prev-block navigation). */
  isFirstItem?: boolean;
  /** Whether this is the last item in the list (enables next-block navigation). */
  isLastItem?: boolean;
}) {
  const handleRef = useRef<InlineEditorHandle | null>(null);
  return (
    <li className="flex items-baseline gap-2">
      <span className="select-none text-base text-muted-foreground">
        {ordered ? `${index + 1}.` : "•"}
      </span>
      <div className="flex-1">
        <InlineEditor
          ref={handleRef}
          value={value}
          autoFocus={autoFocus}
          autoFocusCaret={autoFocusCaret}
          onBlur={onCommit}
          placeholder="List item"
          inputClassName="text-[15px]"
          onKeyDown={(e, md) => {
            // Alt+Arrow: move this item up or down within the list.
            // Pass the live editor value (md) so moveItem can patch items[idx]
            // before swapping — guards against onBlur not yet having fired.
            if (e.altKey && e.key === "ArrowUp") {
              e.preventDefault();
              onMoveUp(handleRef.current?.getMarkdown() ?? md);
              return;
            }
            if (e.altKey && e.key === "ArrowDown") {
              e.preventDefault();
              onMoveDown(handleRef.current?.getMarkdown() ?? md);
              return;
            }
            // ── Arrow intra-list navigation (Notion behaviour) ────────────
            // ArrowUp on non-first item: move to previous item regardless of caret pos.
            // ArrowDown on non-last item: move to next item regardless of caret pos.
            if (e.key === "ArrowUp" && onArrowPrevItem) {
              e.preventDefault();
              onArrowPrevItem();
              return;
            }
            if (e.key === "ArrowDown" && onArrowNextItem) {
              e.preventDefault();
              onArrowNextItem();
              return;
            }
            // ── Arrow cross-block navigation ──────────────────────────────
            // First item at start → move to prev sibling block.
            // preventDefault only when the adjacent block was actually found in DOM.
            if (
              isFirstItem &&
              (e.key === "ArrowUp" || e.key === "ArrowLeft") &&
              handleRef.current?.isCaretAtStart()
            ) {
              if (onArrowPrevBlock()) e.preventDefault();
              return;
            }
            // Last item at end → move to next sibling block.
            if (
              isLastItem &&
              (e.key === "ArrowDown" || e.key === "ArrowRight") &&
              handleRef.current?.isCaretAtEnd()
            ) {
              if (onArrowNextBlock()) e.preventDefault();
              return;
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onCommit(md);
              onEnter();
              return;
            }
            if (e.key === "Backspace") {
              // isEmpty: trim strips browser-injected trailing "\n" from <br>
              const isEmpty = md.replace(/\n/g, "").trim().length === 0;
              if (isEmpty) {
                // Empty item: delete regardless of caret position.
                e.preventDefault();
                onBackspaceEmpty();
                return;
              }
              // Non-empty at caret start: merge into item above (same list) or
              // into prev block (first item only).
              if (handleRef.current?.isCaretAtStart()) {
                if (onMergeIntoAbove) {
                  e.preventDefault();
                  onCommit(md); // flush before mutating items
                  onMergeIntoAbove(md);
                  return;
                }
                if (onBackspaceStart) {
                  e.preventDefault();
                  onBackspaceStart(md);
                }
              }
            }
          }}
        />
      </div>
    </li>
  );
}

function ChecklistLine({ block }: { block: BlockEntity }) {
  const dispatch = useBuilderDispatch();
  const items = (
    (block.data.items as Array<{ text: string; done: boolean }>) ?? []
  ).slice();
  // Tracks which item index should receive autoFocus after a split.
  // Initialise to 0 when the block mounts with a single empty item
  // (slash-menu or markdown-shortcut creation) so the first item gets focus.
  const isFreshBlock =
    items.length === 1 && items[0]?.text === "" && !items[0]?.done;
  const [pendingFocusIdx, setPendingFocusIdx] = useState<number | null>(
    isFreshBlock ? 0 : null,
  );
  // Tracks where the caret should land when a new item gains autoFocus via
  // arrow-key navigation (prev item → 'end', next item → 'start').
  const [pendingFocusCaret, setPendingFocusCaret] = useState<
    "start" | "end" | null
  >(null);
  const prevSiblingId = usePrevSiblingId(block.id);
  const prevBlock = useBuilderState((s) =>
    prevSiblingId ? s.state.blocks[prevSiblingId] : undefined,
  );
  const { setSelectedTableId } = useContext(BacklogSelectionContext);

  // Reset pendingFocusIdx one animation frame after the focused item mounts.
  useEffect(() => {
    if (pendingFocusIdx === null) return;
    const raf = requestAnimationFrame(() => {
      setPendingFocusIdx(null);
      setPendingFocusCaret(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [pendingFocusIdx]);

  // Focus the item at idx and place caret at the given position.
  const focusChecklistItemAt = (idx: number, caret: "start" | "end") => {
    setPendingFocusIdx(idx);
    setPendingFocusCaret(caret);
  };

  const setItems = (next: typeof items) => {
    dispatch({
      type: "UPDATE_BLOCK",
      nodeId: block.id,
      patch: { data: { ...block.data, items: next } },
    });
  };

  const updateItem = (
    idx: number,
    patch: Partial<{ text: string; done: boolean }>,
  ) => {
    const cur = items[idx];
    if (!cur) return;
    if (
      (patch.text === undefined || patch.text === cur.text) &&
      (patch.done === undefined || patch.done === cur.done)
    )
      return;
    const next = items.slice();
    next[idx] = { ...cur, ...patch };
    setItems(next);
  };

  const splitAt = (idx: number) => {
    const next = [
      ...items.slice(0, idx + 1),
      { text: "", done: false },
      ...items.slice(idx + 1),
    ];
    setItems(next);
    // New item inserted below: focus at start of newly created item.
    focusChecklistItemAt(idx + 1, "start");
  };

  const removeAt = (idx: number) => {
    if (items.length <= 1) {
      dispatch({ type: "DELETE_BLOCK", nodeId: block.id });
      return;
    }
    setItems(items.filter((_, i) => i !== idx));
  };

  // Merge checklist item at idx into item at idx-1 (same-list merge).
  const mergeChecklistItemIntoAbove = (idx: number, md: string) => {
    if (idx === 0) return;
    const next = items.slice();
    const above = next[idx - 1];
    if (above) next[idx - 1] = { ...above, text: above.text + md };
    next.splice(idx, 1);
    setItems(next);
    // Focus the merged-into item at the junction.
    focusChecklistItemAt(idx - 1, "end");
  };

  // First-item Backspace with content: merge text into prev block.
  const handleFirstChecklistItemBackspaceStart = (md: string) => {
    if (!prevBlock) return;
    const merged = mergeIntoBlock(prevBlock, md, dispatch, setSelectedTableId);
    if (merged) {
      if (items.length <= 1) {
        dispatch({ type: "DELETE_BLOCK", nodeId: block.id });
      } else {
        setItems(items.slice(1));
      }
    }
  };

  // freshText: the in-editor text at the moment Alt+Arrow fires.
  // Patch items[idx].text before swapping so onBlur latency cannot drop input.
  const moveItem = (idx: number, dir: -1 | 1, freshText?: string) => {
    const newIdx = idx + dir;
    // Boundary guard: no-op when already at first or last position.
    if (newIdx < 0 || newIdx > items.length - 1) return;
    const next = items.slice();
    // Patch text at idx with the live value while preserving done state.
    if (freshText !== undefined && next[idx]) {
      next[idx] = { ...next[idx], text: freshText };
    }
    // splice-based move: remove from current position, insert at new position.
    const [removed] = next.splice(idx, 1);
    next.splice(newIdx, 0, removed);
    setItems(next);
    // Keep caret on the moved item after re-render (preserve current caret side).
    focusChecklistItemAt(newIdx, "end");
  };

  const list = items.length === 0 ? [{ text: "", done: false }] : items;

  return (
    <BlockFrame blockId={block.id}>
      <ul className="space-y-0.5">
        {list.map((item, idx) => (
          <ChecklistItem
            key={`${block.id}-${idx}`}
            value={item.text}
            done={item.done}
            autoFocus={pendingFocusIdx === idx}
            autoFocusCaret={pendingFocusCaret ?? "end"}
            onToggle={() => updateItem(idx, { done: !item.done })}
            onCommit={(md) => updateItem(idx, { text: md })}
            onEnter={() => splitAt(idx)}
            onBackspaceEmpty={() => removeAt(idx)}
            onBackspaceStart={
              idx === 0
                ? (md) => handleFirstChecklistItemBackspaceStart(md)
                : undefined
            }
            onMergeIntoAbove={
              idx > 0 ? (md) => mergeChecklistItemIntoAbove(idx, md) : undefined
            }
            onMoveUp={(fresh) => moveItem(idx, -1, fresh)}
            onMoveDown={(fresh) => moveItem(idx, 1, fresh)}
            onArrowPrevBlock={() => moveCaretToPrevBlockOrTitle(block.id)}
            onArrowNextBlock={() => moveCaretToNextBlock(block.id)}
            onArrowPrevItem={
              idx > 0 ? () => focusChecklistItemAt(idx - 1, "end") : undefined
            }
            onArrowNextItem={
              idx < list.length - 1
                ? () => focusChecklistItemAt(idx + 1, "start")
                : undefined
            }
            isFirstItem={idx === 0}
            isLastItem={idx === list.length - 1}
          />
        ))}
      </ul>
    </BlockFrame>
  );
}

function ChecklistItem({
  value,
  done,
  autoFocus = false,
  autoFocusCaret = "end",
  onToggle,
  onCommit,
  onEnter,
  onBackspaceEmpty,
  onBackspaceStart,
  onMergeIntoAbove,
  onMoveUp,
  onMoveDown,
  onArrowPrevBlock,
  onArrowNextBlock,
  onArrowPrevItem,
  onArrowNextItem,
  isFirstItem = false,
  isLastItem = false,
}: {
  value: string;
  done: boolean;
  autoFocus?: boolean;
  /** Where to place the caret when autoFocus triggers (default 'end'). */
  autoFocusCaret?: "start" | "end";
  onToggle: () => void;
  onCommit: (md: string) => void;
  onEnter: () => void;
  onBackspaceEmpty: () => void;
  /** Called when caret is at start of first item (idx===0) and md has content. */
  onBackspaceStart?: (md: string) => void;
  /** Called when caret is at start of a non-first item (idx>0) and md has content. */
  onMergeIntoAbove?: (md: string) => void;
  // freshValue: live in-editor text passed to prevent stale-items race.
  onMoveUp: (freshValue: string) => void;
  onMoveDown: (freshValue: string) => void;
  /** Move caret to prev sibling block (called when first item caret at start).
   *  Returns true when the adjacent block was found and caret moved. */
  onArrowPrevBlock: () => boolean;
  /** Move caret to next sibling block (called when last item caret at end).
   *  Returns true when the adjacent block was found and caret moved. */
  onArrowNextBlock: () => boolean;
  /** Move caret to previous item within this checklist (ArrowUp on non-first item). */
  onArrowPrevItem?: () => void;
  /** Move caret to next item within this checklist (ArrowDown on non-last item). */
  onArrowNextItem?: () => void;
  /** Whether this is the first item in the checklist. */
  isFirstItem?: boolean;
  /** Whether this is the last item in the checklist. */
  isLastItem?: boolean;
}) {
  const handleRef = useRef<InlineEditorHandle | null>(null);
  return (
    <li className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={done}
        onChange={onToggle}
        className="size-3.5 rounded border-muted-foreground/40"
      />
      <div
        className={cn("flex-1", done && "text-muted-foreground line-through")}
      >
        <InlineEditor
          ref={handleRef}
          value={value}
          autoFocus={autoFocus}
          autoFocusCaret={autoFocusCaret}
          onBlur={onCommit}
          placeholder="To-do"
          inputClassName="text-[15px]"
          onKeyDown={(e, md) => {
            // Alt+Arrow: move this item up or down within the checklist.
            // Pass live editor value so moveItem patches text before swapping.
            if (e.altKey && e.key === "ArrowUp") {
              e.preventDefault();
              onMoveUp(handleRef.current?.getMarkdown() ?? md);
              return;
            }
            if (e.altKey && e.key === "ArrowDown") {
              e.preventDefault();
              onMoveDown(handleRef.current?.getMarkdown() ?? md);
              return;
            }
            // ── Arrow intra-list navigation (Notion behaviour) ────────────
            // ArrowUp on non-first item: move to previous item regardless of caret pos.
            // ArrowDown on non-last item: move to next item regardless of caret pos.
            if (e.key === "ArrowUp" && onArrowPrevItem) {
              e.preventDefault();
              onArrowPrevItem();
              return;
            }
            if (e.key === "ArrowDown" && onArrowNextItem) {
              e.preventDefault();
              onArrowNextItem();
              return;
            }
            // ── Arrow cross-block navigation ──────────────────────────────
            // preventDefault only when adjacent block found in DOM.
            if (
              isFirstItem &&
              (e.key === "ArrowUp" || e.key === "ArrowLeft") &&
              handleRef.current?.isCaretAtStart()
            ) {
              if (onArrowPrevBlock()) e.preventDefault();
              return;
            }
            if (
              isLastItem &&
              (e.key === "ArrowDown" || e.key === "ArrowRight") &&
              handleRef.current?.isCaretAtEnd()
            ) {
              if (onArrowNextBlock()) e.preventDefault();
              return;
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onCommit(md);
              onEnter();
              return;
            }
            if (e.key === "Backspace") {
              // isEmpty: trim strips browser-injected trailing "\n" from <br>
              const isEmpty = md.replace(/\n/g, "").trim().length === 0;
              if (isEmpty) {
                // Empty item: delete regardless of caret position.
                e.preventDefault();
                onBackspaceEmpty();
                return;
              }
              if (handleRef.current?.isCaretAtStart()) {
                if (onMergeIntoAbove) {
                  e.preventDefault();
                  onCommit(md);
                  onMergeIntoAbove(md);
                  return;
                }
                if (onBackspaceStart) {
                  e.preventDefault();
                  onBackspaceStart(md);
                }
              }
            }
          }}
        />
      </div>
    </li>
  );
}
