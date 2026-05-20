"use client";

import { Bold, Code, Italic, Palette } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { iconForBlock, iconForGroup } from "@/builder/blocks/icons";
import {
  type BlockKindSpec,
  blockKindsForContext,
  defaultDataFor,
} from "@/builder/defaults";
import type { BlockEntity, BlockKind } from "@/builder/types/entity";
import { moveCaretToLastBlock } from "@/components/builder/editable-block";
import {
  applyInlineMath,
  wrapLastBacktickPair,
} from "@/components/builder/inline-editor";
import { Kbd } from "@/components/ui/kbd";
import {
  useBuilderDispatch,
  useBuilderState,
} from "@/hooks/builder/use-builder-store.hook";
import { routePaste } from "@/lib/paste-router";
import { cn } from "@/lib/utils";

type Props = {
  parentId: string;
};

type WriterMode =
  | "paragraph"
  | "h1"
  | "h2"
  | "h3"
  | "bullet"
  | "numbered"
  | "check"
  | "quote"
  | "code";

const MODE_PLACEHOLDER: Record<WriterMode, string> = {
  paragraph: "Type, '/' for blocks, '#' for heading, '- ' for bullet…",
  h1: "Heading 1",
  h2: "Heading 2",
  h3: "Heading 3",
  bullet: "List item",
  numbered: "List item",
  check: "To-do",
  quote: "Quote",
  code: "Code",
};

const COLOR_SWATCHES: Array<{ label: string; value: string | null }> = [
  { label: "Default", value: null },
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Yellow", value: "#eab308" },
  { label: "Green", value: "#22c55e" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Purple", value: "#a855f7" },
];

export function NotionWriter({ parentId }: Props) {
  const [mode, setMode] = useState<WriterMode>("paragraph");
  const [isEmpty, setIsEmpty] = useState(true);
  const [slashOpen, setSlashOpen] = useState(false);
  const [toolbar, setToolbar] = useState<{ x: number; y: number } | null>(null);
  const [colorOpen, setColorOpen] = useState(false);

  const editorRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const numberedSeqRef = useRef(1);
  // Tracks empty-Enter presses for double-Enter list exit.
  const justCommittedRef = useRef(false);

  const dispatch = useBuilderDispatch();
  const planKind = useBuilderState(
    (s) => Object.values(s.state.plans)[0]?.kind ?? null,
  );
  const lastIndex = useBuilderState(
    (s) => s.state.children[parentId]?.length ?? 0,
  );

  const platform: "mobile" | "web" = planKind === "mobile" ? "mobile" : "web";
  const specs = useMemo(
    () => blockKindsForContext("docs", platform),
    [platform],
  );
  const grouped = useMemo(() => {
    const byGroup = new Map<string, BlockKindSpec[]>();
    for (const s of specs) {
      const list = byGroup.get(s.group) ?? [];
      list.push(s);
      byGroup.set(s.group, list);
    }
    return Array.from(byGroup.entries());
  }, [specs]);

  const focusEditor = () => {
    requestAnimationFrame(() => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      placeCaretAtEnd(el);
    });
  };

  const clearEditor = () => {
    const el = editorRef.current;
    if (!el) return;
    el.innerHTML = "";
    setIsEmpty(true);
  };

  const insertBlock = (
    kind: BlockKind,
    data?: Record<string, unknown>,
    opts: { keepMode?: boolean } = {},
  ) => {
    const block: BlockEntity = {
      id: crypto.randomUUID(),
      parentId,
      kind,
      context: "docs",
      data: { ...defaultDataFor(kind), ...(data ?? {}) },
    };
    dispatch({ type: "INSERT_BLOCK", parentId, block, index: lastIndex });
    clearEditor();
    if (!opts.keepMode) {
      setMode("paragraph");
      numberedSeqRef.current = 1;
    }
    focusEditor();
  };

  const commitCurrent = (markdown: string) => {
    const m = markdown.trim();
    switch (mode) {
      case "h1":
        insertBlock("heading", { level: 1, text: stripFormatting(m) });
        return;
      case "h2":
        insertBlock("heading", { level: 2, text: stripFormatting(m) });
        return;
      case "h3":
        insertBlock("heading", { level: 3, text: stripFormatting(m) });
        return;
      case "bullet":
        insertBlock(
          "bullet-list",
          { ordered: false, items: [m] },
          { keepMode: true },
        );
        return;
      case "numbered":
        insertBlock(
          "numbered-list",
          { ordered: true, items: [m] },
          { keepMode: true },
        );
        numberedSeqRef.current += 1;
        return;
      case "check":
        insertBlock(
          "checklist",
          { items: [{ text: stripFormatting(m), done: false }] },
          { keepMode: true },
        );
        return;
      case "quote":
        insertBlock("blockquote", { text: m, cite: "" });
        return;
      case "code":
        insertBlock("code-block", {
          language: "ts",
          code: stripFormatting(m),
          filename: "",
        });
        return;
      default:
        insertBlock("paragraph", { markdown: m });
    }
  };

  const handleInput = () => {
    const el = editorRef.current;
    if (!el) return;
    const text = el.innerText;
    const empty = text.length === 0;
    setIsEmpty(empty);
    justCommittedRef.current = false;
    if (mode === "paragraph") {
      const sc = matchShortcut(text);
      if (sc) {
        clearEditor();
        setMode(sc.mode);
        focusEditor();
        return;
      }
      // Inline code backtick immediate visualisation.
      // When the user types the closing backtick, wrap the innermost `…` pair in <code>.
      wrapLastBacktickPair(el);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Inline formatting shortcuts
    const meta = e.metaKey || e.ctrlKey;
    if (meta && !e.shiftKey && (e.key === "b" || e.key === "B")) {
      e.preventDefault();
      document.execCommand("bold");
      return;
    }
    if (meta && !e.shiftKey && (e.key === "i" || e.key === "I")) {
      e.preventDefault();
      document.execCommand("italic");
      return;
    }
    if (meta && !e.shiftKey && (e.key === "e" || e.key === "E")) {
      e.preventDefault();
      wrapSelectionWith("code");
      return;
    }

    if (slashOpen) {
      if (e.key === "Escape") {
        e.preventDefault();
        setSlashOpen(false);
      }
      return;
    }

    // Cross-block arrow nav: paragraph mode only (other modes handled in follow-up).
    // ArrowUp / ArrowLeft at caret start → jump to the last block's editor end.
    // Only fires in paragraph mode; other modes retain native multi-line behaviour.
    if (
      mode === "paragraph" &&
      (e.key === "ArrowUp" || e.key === "ArrowLeft") &&
      isCaretAtStart(editorRef.current)
    ) {
      const el = editorRef.current;
      if (el && moveCaretToLastBlock(el)) {
        e.preventDefault();
      }
      return;
    }

    if (
      e.key === "Backspace" &&
      mode !== "paragraph" &&
      isCaretAtStart(editorRef.current) &&
      isEmpty
    ) {
      e.preventDefault();
      setMode("paragraph");
      numberedSeqRef.current = 1;
      return;
    }

    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      const md = editorToMarkdown(editorRef.current);

      // `$$` on its own line + Enter → insert empty math-block.
      if (mode === "paragraph" && md.trim() === "$$") {
        insertBlock("math-block", { tex: "" });
        return;
      }

      const stayInList =
        mode === "bullet" || mode === "numbered" || mode === "check";
      if (md.trim().length === 0) {
        if (stayInList) {
          // Double Enter (or empty Enter in list) — exit list mode.
          setMode("paragraph");
          numberedSeqRef.current = 1;
          clearEditor();
          focusEditor();
          return;
        }
        if (mode === "paragraph") {
          // Notion-style: empty Enter in paragraph mode inserts a blank paragraph block.
          const empty: BlockEntity = {
            id: crypto.randomUUID(),
            parentId,
            kind: "paragraph",
            context: "docs",
            data: { ...defaultDataFor("paragraph"), markdown: "" },
          };
          dispatch({
            type: "INSERT_BLOCK",
            parentId,
            block: empty,
            index: lastIndex,
          });
          // Writer stays in paragraph mode; focus stays in writer for next input.
          clearEditor();
          focusEditor();
          return;
        }
        // heading / quote / code with empty Enter → no-op (existing behaviour).
        return;
      }
      commitCurrent(md);
      return;
    }

    if (e.key === "/" && mode === "paragraph" && isEmpty && !slashOpen) {
      e.preventDefault();
      setSlashOpen(true);
    }
  };

  // Track selection to position the inline toolbar.
  const refreshToolbar = () => {
    const editor = editorRef.current;
    const wrap = wrapRef.current;
    if (!editor || !wrap) {
      setToolbar(null);
      return;
    }
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setToolbar(null);
      setColorOpen(false);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      setToolbar(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setToolbar(null);
      return;
    }
    setToolbar({
      x: rect.left - wrapRect.left + rect.width / 2,
      y: rect.top - wrapRect.top - 8,
    });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshToolbar reads refs only — stable across renders.
  useEffect(() => {
    const onSel = () => refreshToolbar();
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  // Outside-click closes slash menu.
  useEffect(() => {
    if (!slashOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current) return;
      if (e.target instanceof Node && wrapRef.current.contains(e.target))
        return;
      setSlashOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [slashOpen]);

  // Auto-focus on mount.
  useLayoutEffect(() => {
    const t = setTimeout(() => editorRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <ModeAffordance mode={mode}>
        {/* biome-ignore lint/a11y/useFocusableInteractive: contentEditable is natively focusable. */}
        {/* biome-ignore lint/a11y/useSemanticElements: contentEditable textbox cannot use <input> for multi-format. */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="New block"
          aria-multiline="false"
          data-notion-writer="true"
          data-placeholder={MODE_PLACEHOLDER[mode]}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // On blur, convert any unrendered $…$ spans to KaTeX HTML in paragraph mode.
            if (mode === "paragraph") {
              applyInlineMath(editorRef.current);
            }
          }}
          onClick={(e) => {
            // Toggle: clicking a rendered .math-inline span restores raw $…$.
            const target = e.target as HTMLElement;
            const span = target.closest?.(".math-inline") as HTMLElement | null;
            if (span) {
              const rawTex = span.dataset.tex ?? "";
              const text = document.createTextNode(`$${rawTex}$`);
              span.replaceWith(text);
              // Restore caret after the inserted text.
              const sel = window.getSelection();
              if (sel) {
                const range = document.createRange();
                range.setStartAfter(text);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
              }
            }
          }}
          onPaste={(e) => {
            const t = e.clipboardData.getData("text/plain");
            const routed = routePaste(t);

            if (routed.kind === "url") {
              e.preventDefault();
              // Commit any pending writer content first, then insert link-card.
              const md = editorToMarkdown(editorRef.current);
              if (md.trim().length > 0) {
                commitCurrent(md);
              }
              // Insert link-card block with empty meta (BookmarkCard will fetch).
              insertBlock("link-card", {
                url: routed.url,
                title: "",
                description: "",
                faviconUrl: "",
              });
              return;
            }

            if (routed.kind === "table") {
              e.preventDefault();
              // Commit any pending writer content first.
              const md = editorToMarkdown(editorRef.current);
              if (md.trim().length > 0) {
                commitCurrent(md);
              }
              // Insert table block — columnWidths omitted (undefined → even dist).
              insertBlock("table", {
                columns: routed.columns,
                rows: routed.rows,
              });
              return;
            }

            if (routed.kind === "math") {
              e.preventDefault();
              const md = editorToMarkdown(editorRef.current);
              if (md.trim().length > 0) {
                commitCurrent(md);
              }
              insertBlock("math-block", { tex: routed.tex });
              return;
            }

            // kind === "text" — paste as plain text (strip rich formatting).
            e.preventDefault();
            document.execCommand("insertText", false, t);
          }}
          className={cn(
            "min-h-[1.5em] w-full whitespace-pre-wrap break-words border-0 bg-transparent px-0 outline-none",
            "[&[data-empty='true']:before]:pointer-events-none [&[data-empty='true']:before]:text-muted-foreground/50 [&[data-empty='true']:before]:content-[attr(data-placeholder)]",
            modeInputClass(mode),
          )}
          data-empty={isEmpty ? "true" : "false"}
        />
      </ModeAffordance>

      {toolbar ? (
        <InlineToolbar
          x={toolbar.x}
          y={toolbar.y}
          colorOpen={colorOpen}
          onToggleColor={() => setColorOpen((v) => !v)}
          onCloseColor={() => setColorOpen(false)}
        />
      ) : null}

      {slashOpen ? (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-[60vh] w-72 overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Insert block
          </div>
          {grouped.map(([group, groupSpecs]) => {
            const GroupIcon = iconForGroup(group);
            return (
              <div key={group} className="mb-1">
                <div className="flex items-center gap-1.5 px-2 pb-0.5 pt-1 text-caption font-semibold uppercase tracking-eyebrow text-muted-foreground/70">
                  <GroupIcon className="size-3" />
                  <span>{group}</span>
                </div>
                <div className="flex flex-col">
                  {groupSpecs.map((spec) => {
                    const BlockIcon = iconForBlock(spec.kind);
                    return (
                      <button
                        key={spec.kind}
                        type="button"
                        className="flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSlashOpen(false);
                          insertBlock(spec.kind);
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <BlockIcon className="size-3.5 text-muted-foreground" />
                          <span>{spec.label}</span>
                        </span>
                        {spec.shortcut ? (
                          <Kbd className="ml-2">{spec.shortcut}</Kbd>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function InlineToolbar({
  x,
  y,
  colorOpen,
  onToggleColor,
  onCloseColor,
}: {
  x: number;
  y: number;
  colorOpen: boolean;
  onToggleColor: () => void;
  onCloseColor: () => void;
}) {
  const apply = (cmd: () => void) => (e: React.MouseEvent) => {
    e.preventDefault(); // keep selection
    cmd();
  };

  return (
    <div
      role="toolbar"
      className="pointer-events-auto absolute z-40 -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-1 py-1 text-popover-foreground shadow-md"
      style={{ left: x, top: y }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          aria-label="Bold"
          title="Bold (⌘B)"
          className="flex size-7 items-center justify-center rounded hover:bg-accent"
          onMouseDown={apply(() => document.execCommand("bold"))}
        >
          <Bold className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Italic"
          title="Italic (⌘I)"
          className="flex size-7 items-center justify-center rounded hover:bg-accent"
          onMouseDown={apply(() => document.execCommand("italic"))}
        >
          <Italic className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Inline code"
          title="Code (⌘E)"
          className="flex size-7 items-center justify-center rounded hover:bg-accent"
          onMouseDown={apply(() => wrapSelectionWith("code"))}
        >
          <Code className="size-3.5" />
        </button>
        <div className="relative">
          <button
            type="button"
            aria-label="Color"
            title="Color"
            className="flex size-7 items-center justify-center rounded hover:bg-accent"
            onMouseDown={(e) => {
              e.preventDefault();
              onToggleColor();
            }}
          >
            <Palette className="size-3.5" />
          </button>
          {colorOpen ? (
            <div
              role="menu"
              className="absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 rounded-md border bg-popover p-1 shadow-md"
              onMouseDown={(e) => e.preventDefault()}
            >
              <div className="flex gap-1">
                {COLOR_SWATCHES.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    title={c.label}
                    className={cn(
                      "size-5 rounded-full border transition-transform hover:scale-110",
                      c.value === null && "border-dashed",
                    )}
                    style={
                      c.value
                        ? { backgroundColor: c.value, borderColor: c.value }
                        : undefined
                    }
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (c.value) {
                        document.execCommand("foreColor", false, c.value);
                      } else {
                        document.execCommand("removeFormat");
                      }
                      onCloseColor();
                    }}
                  >
                    {c.value === null ? (
                      <span className="block text-center text-caption leading-[1.1] text-muted-foreground">
                        ✕
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ModeAffordance({
  mode,
  children,
}: {
  mode: WriterMode;
  children: React.ReactNode;
}) {
  if (mode === "bullet") {
    return (
      <div className="flex items-baseline gap-2 py-1">
        <span className="text-base text-muted-foreground">•</span>
        <div className="flex-1">{children}</div>
      </div>
    );
  }
  if (mode === "numbered") {
    return (
      <div className="flex items-baseline gap-2 py-1">
        <span className="text-base text-muted-foreground">1.</span>
        <div className="flex-1">{children}</div>
      </div>
    );
  }
  if (mode === "check") {
    return (
      <div className="flex items-center gap-2 py-1">
        <span className="inline-block size-3.5 rounded border border-muted-foreground/40" />
        <div className="flex-1">{children}</div>
      </div>
    );
  }
  if (mode === "quote") {
    return (
      <div className="border-l-4 border-muted-foreground/40 py-1 pl-3 italic">
        {children}
      </div>
    );
  }
  if (mode === "code") {
    return (
      <div className="rounded-md bg-muted px-3 py-2 font-mono text-sm">
        {children}
      </div>
    );
  }
  return <div className="py-1">{children}</div>;
}

function modeInputClass(mode: WriterMode): string {
  switch (mode) {
    case "h1":
      return "text-3xl font-bold tracking-tight";
    case "h2":
      return "text-2xl font-bold tracking-tight";
    case "h3":
      return "text-xl font-semibold";
    case "code":
      return "font-mono text-sm";
    default:
      return "text-base";
  }
}

function matchShortcut(input: string): { mode: WriterMode } | null {
  if (input === "# ") return { mode: "h1" };
  if (input === "## ") return { mode: "h2" };
  if (input === "### ") return { mode: "h3" };
  if (input === "- " || input === "* ") return { mode: "bullet" };
  if (/^\d+\.\s$/.test(input)) return { mode: "numbered" };
  if (input === "[] " || input === "[ ] ") return { mode: "check" };
  if (input === "> ") return { mode: "quote" };
  if (input === "```") return { mode: "code" };
  return null;
}

// Caret helpers ────────────────────────────────────────────────────────────

function placeCaretAtEnd(el: HTMLElement) {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

function isCaretAtStart(el: HTMLElement | null): boolean {
  if (!el) return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return false;
  const probe = document.createRange();
  probe.selectNodeContents(el);
  probe.setEnd(range.startContainer, range.startOffset);
  return probe.toString().length === 0;
}

// Wrap the current selection in <code>. execCommand has no built-in for code.
function wrapSelectionWith(tag: "code") {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  // If selection already inside a <code>, unwrap it.
  const ancestor = range.commonAncestorContainer.parentElement;
  if (ancestor && ancestor.tagName === "CODE") {
    const parent = ancestor.parentElement;
    if (parent) {
      while (ancestor.firstChild) {
        parent.insertBefore(ancestor.firstChild, ancestor);
      }
      parent.removeChild(ancestor);
    }
    return;
  }
  const wrapper = document.createElement(tag);
  try {
    wrapper.appendChild(range.extractContents());
    range.insertNode(wrapper);
    // Restore selection around the newly wrapped content.
    sel.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(wrapper);
    sel.addRange(newRange);
  } catch {
    // Range crosses block boundaries — bail silently.
  }
}

// HTML → markdown serializer for the writer's contentEditable contents.
// Supports: <strong>/<b>, <em>/<i>, <code>, <span style="color:…">, plain text.
function editorToMarkdown(el: HTMLElement | null): string {
  if (!el) return "";
  return Array.from(el.childNodes).map(nodeToMarkdown).join("");
}

function nodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const inner = Array.from(el.childNodes).map(nodeToMarkdown).join("");
  switch (tag) {
    case "strong":
    case "b":
      return inner.length > 0 ? `**${inner}**` : "";
    case "em":
    case "i":
      return inner.length > 0 ? `*${inner}*` : "";
    case "code":
      return inner.length > 0 ? `\`${inner}\`` : "";
    case "br":
      return " ";
    case "span": {
      // Inline math span: serialise back to $tex$.
      if (el.classList.contains("math-inline") && el.dataset.tex) {
        return `$${el.dataset.tex}$`;
      }
      const color = el.style.color;
      if (color) return `<span style="color:${color}">${inner}</span>`;
      return inner;
    }
    case "font": {
      const color = el.getAttribute("color");
      if (color) return `<span style="color:${color}">${inner}</span>`;
      return inner;
    }
    default:
      return inner;
  }
}

// For headings/checklist/code which only want the literal text without
// markdown decorations.
function stripFormatting(md: string): string {
  return md
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/<[^>]+>/g, "");
}

// wrapLastBacktickPair and applyInlineMath are shared helpers imported from
// inline-editor.tsx — see that file for full algorithm documentation.
