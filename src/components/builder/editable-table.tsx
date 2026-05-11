"use client";

/**
 * EditableTable
 *
 * Inline contentEditable table block for the NotionWriter/EditableBlock pipeline.
 *
 * Features:
 * - colgroup-driven column widths (px), drag-resize via pointer capture.
 * - contentEditable thead (header) + tbody (data) cells. blur → UPDATE_BLOCK.
 * - Row hover: left (+) add-above, right (…) menu delete / add-below.
 * - Column hover: top (+) add left/right, (…) delete column.
 * - Min 1 col × 1 row guard — last col/row deletion is blocked.
 */

import { MoreHorizontal, Plus } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { BlockEntity } from "@/builder/types/entity";
import { useBuilderDispatch } from "@/hooks/builder/use-builder-store.hook";
import { cn } from "@/lib/utils";
import {
  applyInlineMath,
  editorToMarkdown,
  inlineMdToHtml,
  wrapLastBacktickPair,
} from "./inline-editor";

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_COL_WIDTH = 160; // px
const MIN_COL_WIDTH = 40; // px
const MAX_COL_WIDTH = 800; // px

// Stable empty fallback constants (Zustand snapshot safety).
const EMPTY_COLS: string[] = [];
const EMPTY_ROWS: string[][] = [];
const EMPTY_WIDTHS: number[] = [];

// ── Types ─────────────────────────────────────────────────────────────────────

type ColMenuState = { colIdx: number; x: number; y: number } | null;
type RowMenuState = { rowIdx: number; x: number; y: number } | null;

// ── Component ─────────────────────────────────────────────────────────────────

export function EditableTable({
  block,
  outerSelected = false,
}: {
  block: BlockEntity;
  /** When true, renders a ring-2 highlight around the table (2-step delete first stage). */
  outerSelected?: boolean;
}) {
  const dispatch = useBuilderDispatch();

  const columns: string[] = (block.data.columns as string[]) ?? EMPTY_COLS;
  const rows: string[][] = (block.data.rows as string[][]) ?? EMPTY_ROWS;
  const columnWidths: number[] =
    (block.data.columnWidths as number[] | undefined) ?? EMPTY_WIDTHS;

  // Resolve effective widths — undefined means even distribution (DEFAULT_COL_WIDTH per col).
  const effectiveWidths: number[] = columns.map(
    (_, i) => columnWidths[i] ?? DEFAULT_COL_WIDTH,
  );

  // ── Hover tracking ──────────────────────────────────────────────────────────
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  const [hoverCol, setHoverCol] = useState<number | null>(null);

  // ── Dropdown menus ──────────────────────────────────────────────────────────
  const [colMenu, setColMenu] = useState<ColMenuState>(null);
  const [rowMenu, setRowMenu] = useState<RowMenuState>(null);

  // ── Resize state ────────────────────────────────────────────────────────────
  // Store resize state + handlers in a ref so the cleanup useEffect has stable
  // references without needing to list them as dependencies.
  const resizeStateRef = useRef<{
    colIdx: number;
    startX: number;
    startWidth: number;
    widths: number[];
  } | null>(null);

  // Stable handler refs — defined once, stable for the component lifetime.
  const handlersRef = useRef({
    onPointerMove: (_e: PointerEvent) => {},
    onPointerUp: (_e: PointerEvent) => {},
  });

  // Cleanup pointer listeners on unmount.
  useEffect(() => {
    return () => {
      document.removeEventListener(
        "pointermove",
        handlersRef.current.onPointerMove,
      );
      document.removeEventListener(
        "pointerup",
        handlersRef.current.onPointerUp,
      );
    };
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function patch(
    data: Partial<{
      columns: string[];
      rows: string[][];
      columnWidths: number[] | undefined;
    }>,
  ) {
    dispatch({
      type: "UPDATE_BLOCK",
      nodeId: block.id,
      patch: { data: { ...block.data, ...data } },
    });
  }

  function commitCell(
    type: "header" | "data",
    rowIdx: number,
    colIdx: number,
    value: string,
  ) {
    if (type === "header") {
      const next = columns.slice();
      if (next[colIdx] === value) return;
      next[colIdx] = value;
      patch({ columns: next });
    } else {
      const nextRows = rows.map((r) => r.slice());
      const row = nextRows[rowIdx] ?? [];
      if (row[colIdx] === value) return;
      row[colIdx] = value;
      nextRows[rowIdx] = row;
      patch({ rows: nextRows });
    }
  }

  // ── Row operations ───────────────────────────────────────────────────────────

  function addRowAbove(idx: number) {
    const emptyRow = new Array<string>(columns.length).fill("");
    const next = [...rows.slice(0, idx), emptyRow, ...rows.slice(idx)];
    patch({ rows: next });
  }

  function addRowBelow(idx: number) {
    const emptyRow = new Array<string>(columns.length).fill("");
    const next = [...rows.slice(0, idx + 1), emptyRow, ...rows.slice(idx + 1)];
    patch({ rows: next });
  }

  function deleteRow(idx: number) {
    // Guard: keep at least 1 row.
    if (rows.length <= 1) return;
    patch({ rows: rows.filter((_, i) => i !== idx) });
  }

  // ── Column operations ────────────────────────────────────────────────────────

  function addColLeft(idx: number) {
    const nextCols = [...columns.slice(0, idx), "", ...columns.slice(idx)];
    const nextRows = rows.map((r) => [...r.slice(0, idx), "", ...r.slice(idx)]);
    const nextWidths =
      columnWidths.length > 0
        ? [
            ...effectiveWidths.slice(0, idx),
            DEFAULT_COL_WIDTH,
            ...effectiveWidths.slice(idx),
          ]
        : undefined;
    patch({ columns: nextCols, rows: nextRows, columnWidths: nextWidths });
  }

  function addColRight(idx: number) {
    addColLeft(idx + 1);
  }

  function deleteCol(idx: number) {
    // Guard: keep at least 1 column.
    if (columns.length <= 1) return;
    const nextCols = columns.filter((_, i) => i !== idx);
    const nextRows = rows.map((r) => r.filter((_, i) => i !== idx));
    const nextWidths =
      columnWidths.length > 0
        ? effectiveWidths.filter((_, i) => i !== idx)
        : undefined;
    patch({ columns: nextCols, rows: nextRows, columnWidths: nextWidths });
  }

  // ── Column resize ────────────────────────────────────────────────────────────

  function handleResizerPointerDown(
    e: React.PointerEvent<HTMLDivElement>,
    colIdx: number,
  ) {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

    resizeStateRef.current = {
      colIdx,
      startX: e.clientX,
      startWidth: effectiveWidths[colIdx] ?? DEFAULT_COL_WIDTH,
      widths: effectiveWidths.slice(),
    };

    // Reassign stable handler refs before registering to document.
    handlersRef.current.onPointerMove = (ev: PointerEvent) => {
      const state = resizeStateRef.current;
      if (!state) return;
      const delta = ev.clientX - state.startX;
      const newWidth = Math.min(
        MAX_COL_WIDTH,
        Math.max(MIN_COL_WIDTH, state.startWidth + delta),
      );
      state.widths[state.colIdx] = newWidth;
      // Live DOM update for smooth feedback without React re-render on each move.
      const cols = document.querySelectorAll<HTMLElement>(
        `[data-table-col="${CSS.escape(block.id)}-${state.colIdx}"]`,
      );
      for (const col of cols) {
        col.style.width = `${newWidth}px`;
      }
    };

    handlersRef.current.onPointerUp = (ev: PointerEvent) => {
      const state = resizeStateRef.current;
      if (!state) return;
      document.removeEventListener(
        "pointermove",
        handlersRef.current.onPointerMove,
      );
      document.removeEventListener(
        "pointerup",
        handlersRef.current.onPointerUp,
      );
      if (ev.target instanceof Element) {
        try {
          (ev.target as HTMLElement).releasePointerCapture(ev.pointerId);
        } catch {
          // capture may already be released — ignore.
        }
      }
      resizeStateRef.current = null;
      // Commit final widths to store.
      patch({ columnWidths: state.widths });
    };

    document.addEventListener("pointermove", handlersRef.current.onPointerMove);
    document.addEventListener("pointerup", handlersRef.current.onPointerUp);
  }

  // ── Render helpers ───────────────────────────────────────────────────────────

  function renderResizer(colIdx: number) {
    return (
      <div
        aria-hidden
        className="absolute right-0 top-0 z-10 h-full w-1 cursor-col-resize bg-transparent hover:bg-border/60 active:bg-primary/40"
        // Prevent text selection drag from firing contentEditable blur.
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => handleResizerPointerDown(e, colIdx)}
      />
    );
  }

  function renderColHandle(colIdx: number) {
    const isHovered = hoverCol === colIdx;
    if (!isHovered) return null;
    return (
      // biome-ignore lint/a11y/noStaticElementInteractions: container keeps hover alive while child buttons are focused.
      <div
        className="pointer-events-auto absolute -top-6 left-0 z-20 flex items-center gap-0.5"
        onMouseEnter={() => setHoverCol(colIdx)}
      >
        <button
          type="button"
          aria-label={`Add column left of column ${colIdx + 1}`}
          title="Add column left"
          className="flex h-5 items-center gap-0.5 rounded border bg-background px-1 text-[10px] shadow-sm hover:bg-accent"
          onMouseDown={(e) => {
            e.preventDefault();
            addColLeft(colIdx);
            setColMenu(null);
          }}
        >
          <Plus className="size-2.5" />
          <span>L</span>
        </button>
        <button
          type="button"
          aria-label={`Add column right of column ${colIdx + 1}`}
          title="Add column right"
          className="flex h-5 items-center gap-0.5 rounded border bg-background px-1 text-[10px] shadow-sm hover:bg-accent"
          onMouseDown={(e) => {
            e.preventDefault();
            addColRight(colIdx);
            setColMenu(null);
          }}
        >
          <Plus className="size-2.5" />
          <span>R</span>
        </button>
        <button
          type="button"
          aria-label={`Column ${colIdx + 1} options`}
          title="Column options"
          className="flex h-5 w-5 items-center justify-center rounded border bg-background shadow-sm hover:bg-accent"
          onMouseDown={(e) => {
            e.preventDefault();
            const rect = e.currentTarget.getBoundingClientRect();
            setColMenu({ colIdx, x: rect.left, y: rect.bottom + 4 });
          }}
        >
          <MoreHorizontal className="size-2.5" />
        </button>
      </div>
    );
  }

  // ── JSX ──────────────────────────────────────────────────────────────────────

  // Delegate math-inline click → raw $tex$ toggle (same pattern as InlineEditor).
  function handleTableClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    const span = target.closest?.(".math-inline") as HTMLElement | null;
    if (!span) return;
    const rawTex = span.dataset.tex ?? "";
    const text = document.createTextNode(`$${rawTex}$`);
    span.replaceWith(text);
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      range.setStartAfter(text);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  return (
    // Outer wrapper: relative so row/col handles can be positioned.
    // outerSelected adds ring-2 for the 2-step table deletion first stage.
    // biome-ignore lint/a11y/noStaticElementInteractions: click-delegation toggles math-inline span back to raw text — not a navigable interaction.
    // biome-ignore lint/a11y/useKeyWithClickEvents: math-inline toggle is a pointing-device convenience only; keyboard path is typing raw $tex$.
    <div
      className={cn(
        "group/table relative overflow-x-auto rounded-md border",
        outerSelected &&
          "ring-2 ring-primary/60 ring-offset-2 ring-offset-background",
      )}
      onClick={handleTableClick}
    >
      <table
        className="border-collapse text-sm"
        style={{ tableLayout: "fixed", width: "max-content", minWidth: "100%" }}
      >
        <colgroup>
          {effectiveWidths.map((w, i) => (
            // data-table-col lets the live resize handler update via querySelector.
            <col
              // biome-ignore lint/suspicious/noArrayIndexKey: column position is the key.
              key={i}
              data-table-col={`${block.id}-${i}`}
              style={{ width: w }}
            />
          ))}
        </colgroup>

        {/* ── thead ──────────────────────────────────────────────────────── */}
        <thead className="bg-muted/40">
          <tr>
            {columns.map((col, ci) => (
              <th
                // biome-ignore lint/suspicious/noArrayIndexKey: column position is the key.
                key={ci}
                className="relative border-b border-border px-3 py-1.5 text-left font-semibold"
                onMouseEnter={() => setHoverCol(ci)}
                onMouseLeave={() => setHoverCol(null)}
              >
                {/* Column top handle (+L, +R, …) */}
                {renderColHandle(ci)}

                {/* contentEditable header cell */}
                <EditableCell
                  value={col}
                  ariaLabel={`Header cell column ${ci + 1}`}
                  className="min-h-[1.25em] min-w-[1ch] outline-none"
                  onCommit={(next) => commitCell("header", 0, ci, next.trim())}
                />

                {/* Resize handle */}
                {renderResizer(ci)}
              </th>
            ))}
          </tr>
        </thead>

        {/* ── tbody ──────────────────────────────────────────────────────── */}
        <tbody>
          {rows.map((row, ri) => (
            <tr
              // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional.
              key={ri}
              className="group/row border-b border-border last:border-b-0"
              onMouseEnter={() => setHoverRow(ri)}
              onMouseLeave={() => setHoverRow(null)}
            >
              {columns.map((_, ci) => (
                <td
                  // biome-ignore lint/suspicious/noArrayIndexKey: cells are positional.
                  key={ci}
                  className="relative px-3 py-1.5 align-top"
                >
                  {/* Left row add-above handle (leftmost cell only) */}
                  {ci === 0 && hoverRow === ri ? (
                    <button
                      type="button"
                      aria-label={`Add row above row ${ri + 1}`}
                      title="Add row above"
                      className={cn(
                        "pointer-events-auto absolute -left-6 top-1/2 z-20 flex h-5 w-5 -translate-y-1/2",
                        "items-center justify-center rounded border bg-background shadow-sm hover:bg-accent",
                      )}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addRowAbove(ri);
                      }}
                    >
                      <Plus className="size-2.5" />
                    </button>
                  ) : null}

                  {/* Right row menu (rightmost cell only) */}
                  {ci === columns.length - 1 && hoverRow === ri ? (
                    <button
                      type="button"
                      aria-label={`Row ${ri + 1} options`}
                      title="Row options"
                      className={cn(
                        "pointer-events-auto absolute -right-6 top-1/2 z-20 flex h-5 w-5 -translate-y-1/2",
                        "items-center justify-center rounded border bg-background shadow-sm hover:bg-accent",
                      )}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setRowMenu({
                          rowIdx: ri,
                          x: rect.left,
                          y: rect.bottom + 4,
                        });
                      }}
                    >
                      <MoreHorizontal className="size-2.5" />
                    </button>
                  ) : null}

                  {/* contentEditable data cell */}
                  <EditableCell
                    value={row[ci] ?? ""}
                    ariaLabel={`Cell row ${ri + 1}, column ${ci + 1}`}
                    className="min-h-[1.25em] min-w-[1ch] whitespace-pre-wrap break-words outline-none"
                    onCommit={(next) => commitCell("data", ri, ci, next.trim())}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add-row button below the last row */}
      <button
        type="button"
        aria-label="Add row below table"
        title="Add row"
        className={cn(
          "flex w-full items-center justify-center gap-1 border-t border-border py-1",
          "text-[11px] text-muted-foreground/60 opacity-0 transition-opacity",
          "group-hover/table:opacity-100 hover:bg-muted/30 hover:text-foreground",
        )}
        onMouseDown={(e) => {
          e.preventDefault();
          addRowBelow(rows.length - 1 < 0 ? 0 : rows.length - 1);
        }}
      >
        <Plus className="size-3" />
        <span>Add row</span>
      </button>

      {/* ── Column dropdown menu ─────────────────────────────────────────── */}
      {colMenu ? (
        <FloatingMenu
          x={colMenu.x}
          y={colMenu.y}
          onClose={() => setColMenu(null)}
          items={[
            {
              label: "Add column left",
              onClick: () => {
                addColLeft(colMenu.colIdx);
                setColMenu(null);
              },
            },
            {
              label: "Add column right",
              onClick: () => {
                addColRight(colMenu.colIdx);
                setColMenu(null);
              },
            },
            {
              label: "Delete column",
              danger: columns.length <= 1,
              onClick: () => {
                deleteCol(colMenu.colIdx);
                setColMenu(null);
              },
            },
          ]}
        />
      ) : null}

      {/* ── Row dropdown menu ────────────────────────────────────────────── */}
      {rowMenu ? (
        <FloatingMenu
          x={rowMenu.x}
          y={rowMenu.y}
          onClose={() => setRowMenu(null)}
          items={[
            {
              label: "Add row above",
              onClick: () => {
                addRowAbove(rowMenu.rowIdx);
                setRowMenu(null);
              },
            },
            {
              label: "Add row below",
              onClick: () => {
                addRowBelow(rowMenu.rowIdx);
                setRowMenu(null);
              },
            },
            {
              label: "Delete row",
              danger: rows.length <= 1,
              onClick: () => {
                deleteRow(rowMenu.rowIdx);
                setRowMenu(null);
              },
            },
          ]}
        />
      ) : null}
    </div>
  );
}

// ── FloatingMenu ───────────────────────────────────────────────────────────────

type MenuItem = {
  label: string;
  danger?: boolean;
  onClick: () => void;
};

function FloatingMenu({
  x,
  y,
  onClose,
  items,
}: {
  x: number;
  y: number;
  onClose: () => void;
  items: MenuItem[];
}) {
  // Close on outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (e.target instanceof Element) {
        const menu = document.querySelector("[data-floating-menu]");
        if (menu && !menu.contains(e.target)) onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      data-floating-menu
      role="menu"
      className="fixed z-50 min-w-[140px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      style={{ left: x, top: y }}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          className={cn(
            "flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm",
            "hover:bg-accent",
            item.danger && "cursor-not-allowed opacity-50",
          )}
          disabled={item.danger}
          onMouseDown={(e) => {
            e.preventDefault();
            if (!item.danger) item.onClick();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

// ── EditableCell ──────────────────────────────────────────────────────────────

/**
 * Uncontrolled contentEditable cell with inline markdown rendering.
 *
 * Safety guarantees:
 * - External re-sync uses `inlineMdToHtml` (escapeHtml + whitelist tags) — XSS safe.
 * - While the cell is focused, the DOM is never touched from outside.
 * - When an external `value` prop changes and the cell is NOT focused,
 *   `useLayoutEffect` compares `el.innerHTML` with the rendered result and patches
 *   only when they differ — avoids spurious cursor resets.
 * - onInput: wraps backtick pairs immediately (same as InlineEditor / NotionWriter).
 * - onBlur: applies KaTeX math, then serialises to markdown, commits only on change.
 */
function EditableCell({
  value,
  onCommit,
  className,
  ariaLabel,
}: {
  value: string;
  onCommit: (next: string) => void;
  className?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  // Gate: true while this cell owns focus — prevents useLayoutEffect from
  // overwriting the live DOM while the user is still typing.
  const focusedRef = useRef(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || focusedRef.current) return;
    // Re-sync: render markdown to HTML and patch only when it has changed.
    const nextHtml = inlineMdToHtml(value);
    if (el.innerHTML !== nextHtml) {
      el.innerHTML = nextHtml;
    }
  }, [value]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: contentEditable div is interactive by spec — biome does not recognise contentEditable as a role signal.
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-label is valid on a generic contentEditable region.
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      aria-label={ariaLabel}
      className={className}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onInput={(e) => {
        // Immediate backtick-pair wrap — same algorithm as InlineEditor / NotionWriter.
        wrapLastBacktickPair(e.currentTarget as HTMLDivElement);
      }}
      onBlur={(e) => {
        focusedRef.current = false;
        const el = e.currentTarget as HTMLDivElement;
        // Apply KaTeX math conversion before serialising (same as InlineEditor).
        applyInlineMath(el);
        const md = editorToMarkdown(el);
        if (md !== value) onCommit(md);
      }}
      onKeyDown={(e) => {
        // Enter without Shift commits (blur); Shift+Enter falls through to
        // the browser default (inserts a newline in contentEditable).
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          (e.currentTarget as HTMLDivElement).blur();
        }
      }}
    />
  );
}
