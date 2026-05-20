"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useBuilderStateShallow } from "@/hooks/builder/use-builder-store.hook";
import { cn } from "@/lib/utils";

// Token grammar mirrors src/builder/refs/extract.ts. Keep them in sync —
// changes here without a parser update will create unmatched references.
const TRIGGER = /(?:^|\s)@([A-Za-z0-9_:-]*)$/;

type Candidate = {
  id: string;
  label: string;
  badge: string; // short kind hint for the row
};

type Props = Omit<
  React.ComponentProps<typeof Textarea>,
  "value" | "defaultValue" | "onChange"
> & {
  value: string;
  onChange: (value: string) => void;
};

// Drop-in textarea that opens a candidate popover when the user types
// `@`. Selecting a candidate inserts a fully-prefixed token (e.g.
// `@persona:khan`) — the same shape the refs parser recognizes — so any
// downstream renderer that already handles tokens needs no change.
export const MentionInput = forwardRef<HTMLTextAreaElement, Props>(
  function MentionInput(
    { value, onChange, className, ...props },
    forwardedRef,
  ) {
    const localRef = useRef<HTMLTextAreaElement>(null);
    const setRef = (node: HTMLTextAreaElement | null) => {
      localRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    };

    const candidates = useMentionCandidates();
    const [query, setQuery] = useState<string | null>(null);
    const [activeIdx, setActiveIdx] = useState(0);

    const filtered = useMemo(() => {
      if (query == null) return [] as Candidate[];
      const q = query.toLowerCase();
      const matches = candidates.filter(
        (c) =>
          c.id.toLowerCase().includes(q) || c.label.toLowerCase().includes(q),
      );
      return matches.slice(0, 8);
    }, [candidates, query]);

    // Reset highlighted row when the candidate list changes.
    useEffect(() => {
      setActiveIdx(0);
    }, []);

    const computeTrigger = (text: string, caret: number) => {
      const upToCaret = text.slice(0, caret);
      const match = upToCaret.match(TRIGGER);
      return match ? match[1] : null;
    };

    const insertCandidate = (candidate: Candidate) => {
      const el = localRef.current;
      if (!el) return;
      const caret = el.selectionStart ?? value.length;
      const before = value.slice(0, caret);
      const after = value.slice(caret);
      const triggerMatch = before.match(TRIGGER);
      if (!triggerMatch) return;
      const triggerStart = before.length - triggerMatch[0].length;
      const prefix = before.slice(0, triggerStart);
      // Preserve the leading whitespace that triggered the popover.
      const sep = triggerMatch[0].startsWith("@") ? "" : triggerMatch[0][0];
      const next = `${prefix}${sep}@${candidate.id} ${after.replace(/^\s/, "")}`;
      onChange(next);
      setQuery(null);
      // Restore caret right after the inserted token + space.
      const nextCaret = `${prefix}${sep}@${candidate.id} `.length;
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(nextCaret, nextCaret);
      });
    };

    return (
      <div className="relative">
        <Textarea
          ref={setRef}
          value={value}
          className={cn(className)}
          onChange={(e) => {
            const next = e.target.value;
            onChange(next);
            const caret = e.target.selectionStart ?? next.length;
            setQuery(computeTrigger(next, caret));
          }}
          onKeyDown={(e) => {
            if (query == null || filtered.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIdx((i) => (i + 1) % filtered.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIdx((i) => (i - 1 + filtered.length) % filtered.length);
            } else if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault();
              const choice = filtered[activeIdx];
              if (choice) insertCandidate(choice);
            } else if (e.key === "Escape") {
              setQuery(null);
            }
          }}
          onBlur={() => {
            // Defer so click-on-popover lands before we close it.
            setTimeout(() => setQuery(null), 100);
          }}
          {...props}
        />
        {query != null && filtered.length > 0 ? (
          <div className="absolute left-0 top-full z-30 mt-1 w-full max-w-md overflow-hidden rounded-md border bg-popover shadow-md">
            <ul className="max-h-60 overflow-y-auto py-1 text-sm">
              {filtered.map((c, i) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertCandidate(c);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-1.5 text-left",
                      i === activeIdx ? "bg-accent" : "hover:bg-accent/60",
                    )}
                  >
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-caption uppercase text-muted-foreground">
                      {c.badge}
                    </span>
                    <span className="flex-1 truncate">{c.label}</span>
                    <code className="font-mono text-caption text-muted-foreground">
                      {c.id}
                    </code>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  },
);

// Builds a flat candidate list from the snapshot — every named entity
// gets one row, prefix-encoded so the inserted token is parseable. The
// selector returns the raw entity dictionaries (stable references) and
// useMemo converts them into Candidate rows; returning fresh objects
// directly from the selector would defeat useSyncExternalStore caching
// and trigger render storms (see CLAUDE.md "infinite loop trap").
function useMentionCandidates(): Candidate[] {
  const { sections, screens, blocks } = useBuilderStateShallow((s) => ({
    sections: s.state.sections,
    screens: s.state.screens,
    blocks: s.state.blocks,
  }));
  return useMemo(() => {
    const out: Candidate[] = [];
    for (const [id, sec] of Object.entries(sections ?? {})) {
      out.push({
        id: id.startsWith("section:") ? id : `section:${id}`,
        label: sec.title || sec.kind,
        badge: "SEC",
      });
    }
    for (const [id, scr] of Object.entries(screens ?? {})) {
      out.push({
        id: id.startsWith("screen:") ? id : `screen:${id}`,
        label: scr.title || id,
        badge: "SCR",
      });
    }
    for (const [id, blk] of Object.entries(blocks ?? {})) {
      const label = readBlockLabel(blk);
      if (!label) continue;
      out.push({
        id: id.startsWith("block:") ? id : `block:${id}`,
        label,
        badge: blk.kind === "persona" ? "PER" : "BLK",
      });
    }
    return out;
  }, [sections, screens, blocks]);
}

function readBlockLabel(block: { kind: string; data: unknown }): string | null {
  const data = block.data as Record<string, unknown> | undefined;
  if (!data) return null;
  for (const key of ["title", "name", "label", "headline"]) {
    const v = data[key];
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
}
