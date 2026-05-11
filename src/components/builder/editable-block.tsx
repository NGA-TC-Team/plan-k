"use client";

import { GripVertical } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { BlockEntity } from "@/builder/types/entity";
import {
  useBuilderDispatch,
  useBuilderState,
} from "@/hooks/builder/use-builder-store.hook";
import { cn } from "@/lib/utils";
import { useAiFlashStore } from "@/services/stores";
import { BlockShell } from "./block-shell";
import { BookmarkCard } from "./blocks/bookmark-card";
import { MathBlock } from "./blocks/math-block";
import { EditableTable } from "./editable-table";
import { InlineEditor, type InlineEditorHandle } from "./inline-editor";

type Props = {
  blockId: string;
  parentId?: string;
};

// Renders a block inline-editably for kinds that have a primary text/markdown
// field. Kinds we don't yet support fall back to the existing BlockShell
// (double-click → side-panel form editor).
export function EditableBlock({ blockId }: Props) {
  const block = useBuilderState((s) => s.state.blocks[blockId]);
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
          <EditableTable block={block} />
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
      className="group/eb relative py-0.5"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -left-5 top-1.5 hidden text-muted-foreground/40 group-hover/eb:flex"
      >
        <GripVertical className="size-3.5" />
      </span>
      {children}
    </motion.div>
  );
}

function ParagraphLine({ block }: { block: BlockEntity }) {
  const dispatch = useBuilderDispatch();
  const value = (block.data.markdown as string) ?? "";
  const handleRef = useRef<InlineEditorHandle | null>(null);

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
      <InlineEditor
        ref={handleRef}
        value={value}
        onBlur={commit}
        placeholder="Empty paragraph"
        onKeyDown={(e, md) => {
          if (
            e.key === "Backspace" &&
            md.length === 0 &&
            handleRef.current?.isCaretAtStart()
          ) {
            e.preventDefault();
            dispatch({ type: "DELETE_BLOCK", nodeId: block.id });
          }
        }}
        inputClassName="text-base leading-relaxed"
      />
    </BlockFrame>
  );
}

function HeadingLine({ block }: { block: BlockEntity }) {
  const dispatch = useBuilderDispatch();
  const level = (block.data.level as 1 | 2 | 3) ?? 1;
  const value = (block.data.text as string) ?? "";

  const commit = (md: string) => {
    if (md === value) return;
    dispatch({
      type: "UPDATE_BLOCK",
      nodeId: block.id,
      patch: { data: { ...block.data, text: md } },
    });
  };

  const sizeClass =
    level === 1
      ? "text-3xl font-bold tracking-tight"
      : level === 2
        ? "text-2xl font-bold tracking-tight"
        : "text-xl font-semibold";

  return (
    <BlockFrame blockId={block.id}>
      <InlineEditor
        value={value}
        onBlur={commit}
        placeholder={`Heading ${level}`}
        inputClassName={sizeClass}
      />
    </BlockFrame>
  );
}

function QuoteLine({ block }: { block: BlockEntity }) {
  const dispatch = useBuilderDispatch();
  const value = (block.data.text as string) ?? "";
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
          value={value}
          onBlur={commit}
          placeholder="Quote"
          inputClassName="text-base"
        />
      </div>
    </BlockFrame>
  );
}

function CodeLine({ block }: { block: BlockEntity }) {
  const dispatch = useBuilderDispatch();
  const value = (block.data.code as string) ?? "";
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
          value={value}
          onBlur={commit}
          multiline
          toolbar={false}
          placeholder="Code"
          inputClassName="font-mono text-sm"
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

  // Reset pendingFocusIdx one animation frame after the focused item mounts.
  // This prevents the flag from persisting across unrelated re-renders.
  useEffect(() => {
    if (pendingFocusIdx === null) return;
    const raf = requestAnimationFrame(() => setPendingFocusIdx(null));
    return () => cancelAnimationFrame(raf);
  }, [pendingFocusIdx]);

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
    // Request autoFocus on the newly inserted item (idx + 1).
    setPendingFocusIdx(idx + 1);
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
    // Keep caret on the moved item after re-render.
    setPendingFocusIdx(newIdx);
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
            onCommit={(md) => updateItem(0, md)}
            onEnter={() => splitAt(0)}
            onBackspaceEmpty={() => removeAt(0)}
            onMoveUp={(fresh) => moveItem(0, -1, fresh)}
            onMoveDown={(fresh) => moveItem(0, 1, fresh)}
          />
        ) : (
          items.map((item, idx) => (
            <ListItem
              key={`${block.id}-${idx}`}
              ordered={ordered}
              index={idx}
              value={item}
              autoFocus={pendingFocusIdx === idx}
              onCommit={(md) => updateItem(idx, md)}
              onEnter={() => splitAt(idx)}
              onBackspaceEmpty={() => removeAt(idx)}
              onMoveUp={(fresh) => moveItem(idx, -1, fresh)}
              onMoveDown={(fresh) => moveItem(idx, 1, fresh)}
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
  onCommit,
  onEnter,
  onBackspaceEmpty,
  onMoveUp,
  onMoveDown,
}: {
  ordered: boolean;
  index: number;
  value: string;
  autoFocus?: boolean;
  onCommit: (md: string) => void;
  onEnter: () => void;
  onBackspaceEmpty: () => void;
  // freshValue: live in-editor text passed to prevent stale-items race.
  onMoveUp: (freshValue: string) => void;
  onMoveDown: (freshValue: string) => void;
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
          onBlur={onCommit}
          placeholder="List item"
          inputClassName="text-base"
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
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onCommit(md);
              onEnter();
              return;
            }
            if (
              e.key === "Backspace" &&
              md.length === 0 &&
              handleRef.current?.isCaretAtStart()
            ) {
              e.preventDefault();
              onBackspaceEmpty();
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

  // Reset pendingFocusIdx one animation frame after the focused item mounts.
  useEffect(() => {
    if (pendingFocusIdx === null) return;
    const raf = requestAnimationFrame(() => setPendingFocusIdx(null));
    return () => cancelAnimationFrame(raf);
  }, [pendingFocusIdx]);

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
    // Request autoFocus on the newly inserted item (idx + 1).
    setPendingFocusIdx(idx + 1);
  };

  const removeAt = (idx: number) => {
    if (items.length <= 1) {
      dispatch({ type: "DELETE_BLOCK", nodeId: block.id });
      return;
    }
    setItems(items.filter((_, i) => i !== idx));
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
    // Keep caret on the moved item after re-render.
    setPendingFocusIdx(newIdx);
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
            onToggle={() => updateItem(idx, { done: !item.done })}
            onCommit={(md) => updateItem(idx, { text: md })}
            onEnter={() => splitAt(idx)}
            onBackspaceEmpty={() => removeAt(idx)}
            onMoveUp={(fresh) => moveItem(idx, -1, fresh)}
            onMoveDown={(fresh) => moveItem(idx, 1, fresh)}
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
  onToggle,
  onCommit,
  onEnter,
  onBackspaceEmpty,
  onMoveUp,
  onMoveDown,
}: {
  value: string;
  done: boolean;
  autoFocus?: boolean;
  onToggle: () => void;
  onCommit: (md: string) => void;
  onEnter: () => void;
  onBackspaceEmpty: () => void;
  // freshValue: live in-editor text passed to prevent stale-items race.
  onMoveUp: (freshValue: string) => void;
  onMoveDown: (freshValue: string) => void;
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
          onBlur={onCommit}
          placeholder="To-do"
          inputClassName="text-base"
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
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onCommit(md);
              onEnter();
              return;
            }
            if (
              e.key === "Backspace" &&
              md.length === 0 &&
              handleRef.current?.isCaretAtStart()
            ) {
              e.preventDefault();
              onBackspaceEmpty();
            }
          }}
        />
      </div>
    </li>
  );
}
