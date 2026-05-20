"use client";

import { Bold, Code, Italic, Palette } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { renderTexToHtml } from "@/services/third-party-facade/katex";

const COLOR_SWATCHES: Array<{ label: string; value: string | null }> = [
  { label: "Default", value: null },
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Yellow", value: "#eab308" },
  { label: "Green", value: "#22c55e" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Purple", value: "#a855f7" },
];

export type InlineEditorHandle = {
  focus: () => void;
  focusStart: () => void;
  focusEnd: () => void;
  getMarkdown: () => string;
  isEmpty: () => boolean;
  isCaretAtStart: () => boolean;
  isCaretAtEnd: () => boolean;
  setMarkdown: (md: string) => void;
  /** Place caret at a specific character offset within the editor's plain text. */
  placeCaretAt: (charOffset: number) => void;
};

type Props = {
  value: string;
  onChange?: (md: string) => void;
  onBlur?: (md: string) => void;
  onFocus?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>, md: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  autoFocus?: boolean;
  /**
   * Where to place the caret when `autoFocus` triggers.
   * 'end' (default) matches existing behaviour.
   * 'start' is used when navigating to a list item from below (ArrowUp).
   */
  autoFocusCaret?: "start" | "end";
  toolbar?: boolean;
  /** When true (default false), Enter inserts a newline and doesn't fire onKeyDown's preventable Enter logic. */
  multiline?: boolean;
  ref?: React.Ref<InlineEditorHandle>;
};

export function InlineEditor({
  value,
  onChange,
  onBlur,
  onFocus,
  onKeyDown,
  placeholder,
  className,
  inputClassName,
  autoFocus = false,
  autoFocusCaret = "end",
  toolbar = true,
  multiline = false,
  ref,
}: Props) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [isEmpty, setIsEmpty] = useState(value.length === 0);
  const [toolbarPos, setToolbarPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [colorOpen, setColorOpen] = useState(false);
  const lastValueRef = useRef(value);

  // Initialise / re-sync when external value changes AND editor isn't focused.
  useLayoutEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (document.activeElement === el) return; // don't clobber while typing
    if (lastValueRef.current === value && el.innerHTML !== "") return;
    el.innerHTML = inlineMdToHtml(value);
    lastValueRef.current = value;
    setIsEmpty(value.length === 0);
  }, [value]);

  useLayoutEffect(() => {
    if (!autoFocus) return;
    const t = setTimeout(() => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      if (autoFocusCaret === "start") {
        placeCaretAtStart(el);
      } else {
        placeCaretAtEnd(el);
      }
    }, 30);
    return () => clearTimeout(t);
  }, [autoFocus, autoFocusCaret]);

  // Imperative handle for parent components.
  useImperativeRef(ref, () => ({
    focus: () => editorRef.current?.focus(),
    focusStart: () => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      placeCaretAtStart(el);
    },
    focusEnd: () => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      placeCaretAtEnd(el);
    },
    getMarkdown: () => editorToMarkdown(editorRef.current),
    isEmpty: () => (editorRef.current?.innerText.length ?? 0) === 0,
    isCaretAtStart: () => isCaretAtStart(editorRef.current),
    isCaretAtEnd: () => isCaretAtEnd(editorRef.current),
    setMarkdown: (md: string) => {
      const el = editorRef.current;
      if (!el) return;
      el.innerHTML = inlineMdToHtml(md);
      lastValueRef.current = md;
      setIsEmpty(md.length === 0);
    },
    placeCaretAt: (charOffset: number) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      placeCaretAtOffset(el, charOffset);
    },
  }));

  const handleInput = () => {
    const el = editorRef.current;
    if (!el) return;
    // Use textContent (ignores <br> nodes) and trim to avoid false non-empty
    // when the browser auto-inserts a trailing <br> into an empty contentEditable.
    const text = (el.textContent ?? "").replace(/​/g, "").trim();
    setIsEmpty(text.length === 0);
    // Inline code backtick immediate wrap — same algorithm as notion-writer.
    wrapLastBacktickPair(el);
    const md = editorToMarkdown(el);
    lastValueRef.current = md;
    onChange?.(md);
  };

  const refreshToolbar = () => {
    const editor = editorRef.current;
    const wrap = wrapRef.current;
    if (!editor || !wrap || !toolbar) {
      setToolbarPos(null);
      return;
    }
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setToolbarPos(null);
      setColorOpen(false);
      return;
    }
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      setToolbarPos(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setToolbarPos(null);
      return;
    }
    const wrapRect = wrap.getBoundingClientRect();
    setToolbarPos({
      x: rect.left - wrapRect.left + rect.width / 2,
      y: rect.top - wrapRect.top - 8,
    });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: refs only.
  useEffect(() => {
    if (!toolbar) return;
    const onSel = () => refreshToolbar();
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, [toolbar]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
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
      wrapSelectionWithCode();
      return;
    }
    if (!multiline && e.key === "Enter" && !e.shiftKey) {
      // Caller decides; default we prevent so consumer can handle commit.
    }
    onKeyDown?.(e, editorToMarkdown(editorRef.current));
  };

  // Explicit React render for placeholder avoids relying on CSS attr() + ::before,
  // which breaks when the browser inserts a stray <br> into an empty contentEditable
  // and flips data-empty to "false" before the next React paint.
  const showPlaceholder = isEmpty && !!placeholder;

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      {/* biome-ignore lint/a11y/useFocusableInteractive: contentEditable is focusable. */}
      {/* biome-ignore lint/a11y/useSemanticElements: contentEditable supports rich formatting. */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label={placeholder || "Editable content"}
        aria-multiline={multiline ? "true" : "false"}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onFocus={() => onFocus?.()}
        onBlur={() => {
          // Apply inline math conversion before serialising to markdown.
          applyInlineMath(editorRef.current);
          const md = editorToMarkdown(editorRef.current);
          onBlur?.(md);
        }}
        onClick={(e) => {
          // Toggle: clicking a .math-inline span restores raw $…$.
          const target = e.target as HTMLElement;
          const span = target.closest?.(".math-inline") as HTMLElement | null;
          if (span) {
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
        }}
        onPaste={(e) => {
          e.preventDefault();
          const t = e.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, t);
        }}
        className={cn(
          "min-h-[1.25em] w-full whitespace-pre-wrap break-words border-0 bg-transparent px-0 outline-none",
          inputClassName,
        )}
      />
      {showPlaceholder ? (
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 select-none text-muted-foreground/40",
            inputClassName,
          )}
        >
          {placeholder}
        </span>
      ) : null}
      {toolbar && toolbarPos ? (
        <FloatingToolbar
          x={toolbarPos.x}
          y={toolbarPos.y}
          colorOpen={colorOpen}
          onToggleColor={() => setColorOpen((v) => !v)}
          onCloseColor={() => setColorOpen(false)}
        />
      ) : null}
    </div>
  );
}

function FloatingToolbar({
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
    e.preventDefault();
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
          onMouseDown={apply(() => wrapSelectionWithCode())}
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

// — helpers ───────────────────────────────────────────────────────────────

/**
 * Place the caret at a specific character offset within `el`'s plain text.
 * Walks text nodes via TreeWalker, accumulating character counts until the
 * target offset is reached, then sets a collapsed Selection at that exact
 * (textNode, localOffset) position.
 *
 * Falls back to placeCaretAtEnd when offset exceeds total character count
 * (e.g. after a merge that appended content).
 */
export function placeCaretAtOffset(el: HTMLElement, charOffset: number): void {
  const sel = window.getSelection();
  if (!sel) return;
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
  // charOffset exceeds total content — fall back to end.
  placeCaretAtEnd(el);
}

function placeCaretAtEnd(el: HTMLElement) {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

function placeCaretAtStart(el: HTMLElement) {
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

export function isCaretAtStart(el: HTMLElement | null): boolean {
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

export function isCaretAtEnd(el: HTMLElement | null): boolean {
  if (!el) return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return false;
  const probe = document.createRange();
  probe.selectNodeContents(el);
  probe.setStart(range.endContainer, range.endOffset);
  return probe.toString().length === 0;
}

export function wrapSelectionWithCode() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const ancestor = range.commonAncestorContainer.parentElement;
  if (ancestor && ancestor.tagName === "CODE") {
    const parent = ancestor.parentElement;
    if (parent) {
      while (ancestor.firstChild)
        parent.insertBefore(ancestor.firstChild, ancestor);
      parent.removeChild(ancestor);
    }
    return;
  }
  const wrapper = document.createElement("code");
  try {
    wrapper.appendChild(range.extractContents());
    range.insertNode(wrapper);
    sel.removeAllRanges();
    const newRange = document.createRange();
    newRange.selectNodeContents(wrapper);
    sel.addRange(newRange);
  } catch {
    /* range crosses block boundary */
  }
}

export function editorToMarkdown(el: HTMLElement | null): string {
  if (!el) return "";
  return Array.from(el.childNodes).map(nodeToMarkdown).join("");
}

function nodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
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
    case "del":
    case "s":
      return inner.length > 0 ? `~~${inner}~~` : "";
    case "code":
      return inner.length > 0 ? `\`${inner}\`` : "";
    case "br":
      return "\n";
    case "div":
    case "p":
      return inner;
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

// Round-trip: minimal markdown → HTML for inline elements only.
export function inlineMdToHtml(md: string): string {
  if (!md) return "";
  let h = escapeHtml(md);
  // Restore color spans we serialized as raw HTML.
  h = h.replace(
    /&lt;span style="color:([^"]+)"&gt;([\s\S]*?)&lt;\/span&gt;/g,
    (_m, color, body) => `<span style="color:${color}">${body}</span>`,
  );
  // **bold**
  h = h.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  // *italic*  (avoid eating ** that was already replaced — those have <strong>)
  h = h.replace(/(^|[^\w*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
  // ~~strike~~
  h = h.replace(/~~([^~\n]+)~~/g, "<del>$1</del>");
  // `code`
  h = h.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  // $math$ — inline math → KaTeX span (contenteditable=false).
  h = h.replace(/(?<!\$)\$([^$\n]+?)\$(?!\$)/g, (_m, tex: string) => {
    const html = renderTexToHtml(tex, { displayMode: false });
    return `<span class="math-inline" data-tex="${escapeAttr(tex)}" contenteditable="false">${html}</span>`;
  });
  // newlines → <br>
  h = h.replace(/\n/g, "<br>");
  return h;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

// ── Inline code: immediate backtick-pair wrap ─────────────────────────────────
// Shared algorithm with notion-writer; kept local to avoid cross-component
// coupling for a pure-DOM helper. Range API direct manipulation for precise
// cursor control (execCommand insertHTML is deprecated).

export function wrapLastBacktickPair(root: HTMLElement): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let node = walker.nextNode();
  while (node) {
    textNodes.push(node as Text);
    node = walker.nextNode();
  }

  type Ptr = { ni: number; offset: number };
  const chars: Ptr[] = [];
  for (let ni = 0; ni < textNodes.length; ni++) {
    const len = textNodes[ni].length;
    for (let j = 0; j < len; j++) {
      chars.push({ ni, offset: j });
    }
  }

  let closeIdx = -1;
  for (let i = chars.length - 1; i >= 0; i--) {
    const { ni, offset } = chars[i];
    if (textNodes[ni].textContent?.[offset] === "`") {
      closeIdx = i;
      break;
    }
  }
  if (closeIdx < 0) return;

  const closeNode = textNodes[chars[closeIdx].ni];
  if (closeNode.parentElement?.closest("code")) return;

  let openIdx = -1;
  for (let i = closeIdx - 1; i >= 0; i--) {
    const { ni, offset } = chars[i];
    if (textNodes[ni].textContent?.[offset] === "`") {
      openIdx = i;
      break;
    }
  }
  if (openIdx < 0) return;
  if (closeIdx - openIdx <= 1) return;

  const openNode = textNodes[chars[openIdx].ni];
  if (openNode.parentElement?.closest("code")) return;

  const range = document.createRange();
  range.setStart(textNodes[chars[openIdx].ni], chars[openIdx].offset);
  range.setEnd(textNodes[chars[closeIdx].ni], chars[closeIdx].offset + 1);

  const fragment = range.extractContents();
  const codeEl = document.createElement("code");

  const fragNodes = Array.from(fragment.childNodes);
  if (fragNodes.length === 0) return;

  const firstChild = fragNodes[0];
  if (firstChild.nodeType === Node.TEXT_NODE) {
    const txt = firstChild.textContent ?? "";
    firstChild.textContent = txt.startsWith("`") ? txt.slice(1) : txt;
  }
  const lastChild = fragNodes[fragNodes.length - 1];
  if (lastChild.nodeType === Node.TEXT_NODE) {
    const txt = lastChild.textContent ?? "";
    lastChild.textContent = txt.endsWith("`") ? txt.slice(0, -1) : txt;
  }

  while (fragment.firstChild) {
    codeEl.appendChild(fragment.firstChild);
  }
  range.insertNode(codeEl);

  const sel = window.getSelection();
  if (sel) {
    const after = document.createRange();
    after.setStartAfter(codeEl);
    after.collapse(true);
    sel.removeAllRanges();
    sel.addRange(after);
  }
}

// ── Inline math: $…$ → KaTeX span on blur ────────────────────────────────────

export function applyInlineMath(root: HTMLElement | null): void {
  if (!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = (node as Text).parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest(".math-inline")) return NodeFilter.FILTER_REJECT;
      if (parent.closest("code")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  let n = walker.nextNode();
  while (n) {
    textNodes.push(n as Text);
    n = walker.nextNode();
  }

  const INLINE_MATH_RE = /(?<!\$)\$([^$\n]+?)\$(?!\$)/g;

  for (const textNode of textNodes) {
    const text = textNode.textContent ?? "";
    if (!text.includes("$")) continue;

    INLINE_MATH_RE.lastIndex = 0;
    const matches: Array<{ start: number; end: number; tex: string }> = [];
    let m: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: standard regex exec loop.
    while ((m = INLINE_MATH_RE.exec(text)) !== null) {
      matches.push({
        start: m.index,
        end: m.index + m[0].length,
        tex: m[1] ?? "",
      });
    }
    if (matches.length === 0) continue;

    const frag = document.createDocumentFragment();
    let cursor = 0;
    for (const match of matches) {
      if (match.start > cursor) {
        frag.appendChild(
          document.createTextNode(text.slice(cursor, match.start)),
        );
      }
      const span = document.createElement("span");
      span.className = "math-inline";
      span.dataset.tex = match.tex;
      span.contentEditable = "false";
      // KaTeX output is trusted HTML from our facade — no user-supplied HTML.
      span.innerHTML = renderTexToHtml(match.tex, { displayMode: false });
      frag.appendChild(span);
      cursor = match.end;
    }
    if (cursor < text.length) {
      frag.appendChild(document.createTextNode(text.slice(cursor)));
    }

    textNode.parentNode?.replaceChild(frag, textNode);
  }
}

// Imperative handle helper.
function useImperativeRef<T>(ref: React.Ref<T> | undefined, factory: () => T) {
  useLayoutEffect(() => {
    if (!ref) return;
    const value = factory();
    if (typeof ref === "function") {
      ref(value);
      return () => {
        ref(null as unknown as T);
      };
    }
    (ref as React.RefObject<T | null>).current = value;
    return () => {
      (ref as React.RefObject<T | null>).current = null;
    };
  });
}
