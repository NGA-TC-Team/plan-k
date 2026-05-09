"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createStore, useStore } from "zustand";
import type { BuilderStore } from "@/builder/store";
import type { Intent } from "@/builder/types/intent";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useCreateProjectMutation, useProjectsQuery } from "@/data/projects";
import { type SearchHit, useSearchQuery } from "@/data/search/queries";
import { useOptionalBuilderStore } from "@/hooks/builder/use-builder-store.hook";
import {
  useBuilderUiStore,
  useSearchHighlightStore,
  useThemeStore,
  useUiStore,
} from "@/services/stores";
import type { CommandContext } from "./actions";
import {
  COMMAND_GROUPS,
  type ResolvedCommand,
  resolveCommands,
} from "./registry";

function SearchResultsGroup({
  query,
  router,
  builderDispatch,
  onClose,
}: {
  query: string;
  router: ReturnType<typeof useRouter>;
  builderDispatch: ((intent: Intent) => void) | null;
  onClose: () => void;
}) {
  const search = useSearchQuery(query);
  const flash = useSearchHighlightStore((s) => s.flash);

  if (!search.data || search.data.hits.length === 0) return null;

  const onPick = (hit: SearchHit) => {
    const targetId =
      hit.kind === "block"
        ? hit.blockId
        : hit.kind === "section"
          ? hit.sectionId
          : null;

    // Always navigate to the plan; selection + flash are dispatched
    // through the builder store only when we land in the same plan
    // that's already mounted (router.push won't unmount the builder
    // for same-plan navigation).
    router.push(`/plan/${hit.planId}`);

    if (targetId) {
      // Best-effort dispatch — the builder store may be the right one
      // already, or we may have just kicked off a navigation. Either
      // way, set the highlight so the rendered page can pick it up.
      flash([targetId]);
      if (builderDispatch) {
        builderDispatch({
          type: "SELECT_NODE",
          nodeId: targetId,
        } satisfies Intent);
      }
    }
    onClose();
  };

  return (
    <div>
      <CommandSeparator />
      <CommandGroup heading="검색 결과">
        {search.data.hits.slice(0, 12).map((hit, i) => {
          const id =
            hit.kind === "block"
              ? hit.blockId
              : hit.kind === "section"
                ? hit.sectionId
                : hit.planId;
          return (
            <CommandItem
              key={`${id}::${hit.kind}::${hit.refDepth}`}
              value={`__search__${id}__${i}`}
              onSelect={() => onPick(hit)}
            >
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                {hit.kind}
              </span>
              <span className="flex-1 truncate">
                {hit.kind === "block"
                  ? `${hit.projectTitle} · ${hit.blockKind}`
                  : hit.kind === "section"
                    ? `${hit.projectTitle} · ${hit.sectionTitle}`
                    : hit.projectTitle}
              </span>
              {hit.refDepth > 0 ? (
                <span className="text-[10px] text-muted-foreground">
                  ↳ depth {hit.refDepth}
                </span>
              ) : null}
            </CommandItem>
          );
        })}
      </CommandGroup>
    </div>
  );
}

// Inert sentinel store so useStore can always run, even when no builder is
// mounted. Its state is never read because builderTick gates the selector.
const FALLBACK_STORE = createStore<BuilderStore>(() => ({
  // biome-ignore lint/suspicious/noExplicitAny: never read; sentinel only
  state: {} as any,
  dispatch: () => {},
}));

export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  const [query, setQuery] = useState("");

  // Reset the input every time the palette opens — leftover queries
  // from a prior session would otherwise pre-filter the action list.
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command shouldFilter>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="명령 또는 위치 검색..."
        />
        <CommandList>
          <CommandEmpty>일치하는 명령 없음</CommandEmpty>
          {open ? (
            <PaletteContents query={query} onClose={() => setOpen(false)} />
          ) : null}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

function PaletteContents({
  query,
  onClose,
}: {
  query: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { data: projectsData } = useProjectsQuery();
  const createProject = useCreateProjectMutation();
  const themeStore = useThemeStore();
  const builderStore = useOptionalBuilderStore();
  const builderUi = useBuilderUiStore();
  const setHelpSheetOpen = useUiStore((s) => s.setHelpSheetOpen);
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);

  // Subscribe unconditionally — when there is no builder context we still
  // call the hook against a sentinel store so React's hook order stays
  // stable. The selector returns "" in that case.
  const builderTick = useStore(builderStore ?? FALLBACK_STORE, (s) =>
    builderStore
      ? `${s.state.historyPast.length}.${s.state.historyFuture.length}.${
          s.state.selection.kind === "node" ? s.state.selection.id : ""
        }.${s.state.currentScreenId ?? ""}`
      : "",
  );

  // Read once per render — palette only mounts content when open, and the
  // builder subscription above forces a re-render whenever undo/selection/
  // screen shift, so re-resolving commands here is cheap.
  void builderTick;
  const ctx: CommandContext = {
    router,
    builder: builderStore ?? null,
    builderDispatch: builderStore?.getState().dispatch ?? null,
    ui: { setHelpSheetOpen, setPaletteOpen },
    builderUi,
    theme: {
      set: themeStore.setTheme,
      toggle: themeStore.toggleTheme,
      current: themeStore.resolvedTheme,
    },
    projects: projectsData ?? [],
    createProject: (input) => createProject.mutateAsync(input),
  };

  const commands = resolveCommands(ctx);

  // Group → ordered list of commands for that group, in JSON-defined order.
  const grouped = new Map<string, ResolvedCommand[]>();
  for (const cmd of commands) {
    const list = grouped.get(cmd.group) ?? [];
    list.push(cmd);
    grouped.set(cmd.group, list);
  }

  const orderedGroups = Object.keys(COMMAND_GROUPS).filter((g) =>
    grouped.has(g),
  );

  return (
    <>
      <SearchResultsGroup
        query={query}
        router={router}
        builderDispatch={ctx.builderDispatch}
        onClose={onClose}
      />
      {orderedGroups.map((group, i) => {
        const items = grouped.get(group);
        if (!items || items.length === 0) return null;
        return (
          <div key={group}>
            {i > 0 ? <CommandSeparator /> : null}
            <CommandGroup heading={COMMAND_GROUPS[group]}>
              {items.map((cmd) => {
                const Icon = cmd.icon;
                return (
                  <CommandItem
                    key={cmd.id}
                    value={`${cmd.label} ${cmd.keywords?.join(" ") ?? ""}`}
                    onSelect={async () => {
                      await cmd.run(ctx);
                      onClose();
                    }}
                  >
                    {Icon ? <Icon /> : null}
                    <span>{cmd.label}</span>
                    {cmd.shortcut && cmd.shortcut.length > 0 ? (
                      <CommandShortcut>
                        {cmd.shortcut.join(" ")}
                      </CommandShortcut>
                    ) : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </div>
        );
      })}
    </>
  );
}
