"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { iconForBlock, iconForGroup } from "@/builder/blocks/icons";
import { type BlockKindSpec, blockKindsForContext } from "@/builder/defaults";
import type { BlockContext, BlockKind } from "@/builder/types/entity";
import { useInsertMruStore } from "@/services/stores";

type Props = {
  context: BlockContext;
  platform: "web" | "mobile";
  onPick: (kind: BlockKind) => void;
  autoFocus?: boolean;
};

export function BlockKindPicker({
  context,
  platform,
  onPick,
  autoFocus,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");

  const pushMru = useInsertMruStore((s) => s.push);
  const mruKinds = useInsertMruStore((s) => s.mru[context]);

  const specs = useMemo(
    () => blockKindsForContext(context, platform),
    [context, platform],
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

  // Map shortcut letters to specs for fast lookup while the popover is open.
  const shortcutMap = useMemo(() => {
    const map = new Map<string, BlockKindSpec>();
    for (const s of specs) {
      if (s.shortcut) map.set(s.shortcut.toUpperCase(), s);
    }
    return map;
  }, [specs]);

  const recentSpecs = useMemo(() => {
    if (mruKinds.length === 0) return [];
    const bySpec = new Map(specs.map((s) => [s.kind, s]));
    return mruKinds.flatMap((k) => {
      const s = bySpec.get(k);
      return s ? [s] : [];
    });
  }, [mruKinds, specs]);

  const filteredSpecs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return specs.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.group.toLowerCase().includes(q) ||
        s.kind.toLowerCase().includes(q),
    );
  }, [query, specs]);

  // Focus the input on mount when autoFocus is requested.
  useEffect(() => {
    if (!autoFocus) return;
    setQuery("");
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [autoFocus]);

  const handlePick = (kind: BlockKind) => {
    // MRU push happens here so the caller (onPick) doesn't need to.
    pushMru(context, kind);
    onPick(kind);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    // While the search input is focused, don't intercept letter keys —
    // they should reach the input. The shortcut hot-keys still work via
    // the popover content keydown when focus is anywhere else.
    if (e.target instanceof HTMLInputElement) return;
    if (e.key.length !== 1) return;
    const spec = shortcutMap.get(e.key.toUpperCase());
    if (!spec) return;
    e.preventDefault();
    handlePick(spec.kind);
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: keyboard shortcut handler requires onKeyDown on a non-interactive container
    <div onKeyDown={handleKeyDown}>
      <div className="flex items-center justify-between px-2 py-1.5">
        <div className="text-xs font-medium text-muted-foreground">
          Insert {context} block
        </div>
        <div className="text-[10px] text-muted-foreground/70">
          {query ? "filtered" : "press a letter"}
        </div>
      </div>
      <div className="px-1.5 pb-1.5">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="블록 검색..."
          className="h-7 w-full rounded-md border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              if (query) {
                e.preventDefault();
                setQuery("");
              }
            } else if (e.key === "Enter") {
              const first = filteredSpecs?.[0];
              if (first) {
                e.preventDefault();
                handlePick(first.kind);
              }
            }
          }}
        />
      </div>
      {filteredSpecs ? (
        <div className="flex flex-col px-1 pb-1">
          {filteredSpecs.length === 0 ? (
            <div className="px-2 py-3 text-center text-xs text-muted-foreground">
              일치하는 블록 없음
            </div>
          ) : (
            filteredSpecs.map((spec) => {
              const BlockIcon = iconForBlock(spec.kind);
              return (
                <button
                  key={spec.kind}
                  type="button"
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                  onClick={() => handlePick(spec.kind)}
                >
                  <span className="flex items-center gap-2">
                    <BlockIcon className="size-3.5 text-muted-foreground" />
                    <span>{spec.label}</span>
                    <span className="text-[10px] text-muted-foreground/70">
                      {spec.group}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      ) : null}
      {!filteredSpecs && recentSpecs.length > 0 ? (
        <div className="mb-1">
          <div className="flex items-center gap-1.5 px-2 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            <span>Recent</span>
          </div>
          <div className="flex flex-col">
            {recentSpecs.map((spec) => {
              const BlockIcon = iconForBlock(spec.kind);
              return (
                <button
                  key={`recent-${spec.kind}`}
                  type="button"
                  className="flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                  onClick={() => handlePick(spec.kind)}
                >
                  <span className="flex items-center gap-2">
                    <BlockIcon className="size-3.5 text-muted-foreground" />
                    <span>{spec.label}</span>
                  </span>
                  {spec.shortcut ? (
                    <kbd className="ml-2 rounded-sm border border-border/60 bg-muted px-1 text-[10px] font-mono text-muted-foreground">
                      {spec.shortcut}
                    </kbd>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {!filteredSpecs &&
        grouped.map(([group, groupSpecs]) => {
          const GroupIcon = iconForGroup(group);
          return (
            <div key={group} className="mb-1">
              <div className="flex items-center gap-1.5 px-2 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
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
                      onClick={() => handlePick(spec.kind)}
                    >
                      <span className="flex items-center gap-2">
                        <BlockIcon className="size-3.5 text-muted-foreground" />
                        <span>{spec.label}</span>
                      </span>
                      {spec.shortcut ? (
                        <kbd className="ml-2 rounded-sm border border-border/60 bg-muted px-1 text-[10px] font-mono text-muted-foreground">
                          {spec.shortcut}
                        </kbd>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
    </div>
  );
}
