"use client";

import { useRouter } from "next/navigation";
import { createStore, useStore } from "zustand";
import type { BuilderStore } from "@/builder/store";
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
import { useOptionalBuilderStore } from "@/hooks/builder/use-builder-store.hook";
import {
  useBuilderUiStore,
  useThemeStore,
  useUiStore,
} from "@/services/stores";
import type { CommandContext } from "./actions";
import {
  COMMAND_GROUPS,
  type ResolvedCommand,
  resolveCommands,
} from "./registry";

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

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command>
        <CommandInput placeholder="명령 또는 위치 검색..." />
        <CommandList>
          <CommandEmpty>일치하는 명령 없음</CommandEmpty>
          {open ? <PaletteContents onClose={() => setOpen(false)} /> : null}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

function PaletteContents({ onClose }: { onClose: () => void }) {
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
      current: themeStore.theme,
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
