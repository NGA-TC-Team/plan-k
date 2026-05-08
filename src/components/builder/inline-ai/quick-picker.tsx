"use client";

import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { BlockEntity } from "@/builder/types/entity";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useInlineAiStore } from "@/services/stores";
import { request } from "@/services/third-party-facade";
import { INLINE_ACTIONS, type InlineActionId } from "./actions";

// Keyboard-triggered quick picker for inline AI actions. Bound to Cmd+.
// in useGlobalShortcuts; opens with a block snapshot captured at trigger
// time so this component can live in GlobalOverlays without subscribing
// to BuilderContext.
export function InlineAiQuickPicker() {
  const block = useInlineAiStore((s) => s.pickerBlock);
  const close = useInlineAiStore((s) => s.closePicker);
  const addSession = useInlineAiStore((s) => s.addSession);
  const setDrawerOpen = useInlineAiStore((s) => s.setOpen);

  const open = block !== null;

  const onPick = async (actionId: InlineActionId) => {
    if (!block) return;
    close();
    const t = toast.loading("Sending to AI…");
    try {
      const res = await request<{
        ok: boolean;
        sessionId: string;
        reason?: string;
      }>({
        method: "POST",
        url: "/inline-ai",
        data: { planId: block.planId, blockId: block.id, actionId },
      });
      if (!res.ok) {
        toast.error(`Action failed: ${res.reason ?? "unknown"}`, { id: t });
        return;
      }
      addSession(res.sessionId);
      toast.success("Action sent", {
        id: t,
        action: { label: "Review", onClick: () => setDrawerOpen(true) },
      });
    } catch (err) {
      toast.error(
        `Action failed: ${err instanceof Error ? err.message : String(err)}`,
        { id: t },
      );
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={(o) => !o && close()}>
      <Command>
        <CommandInput placeholder="AI action…" />
        <CommandList>
          <CommandEmpty>No action available.</CommandEmpty>
          {block ? renderGroups(blockEntityFrom(block), onPick) : null}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

function blockEntityFrom(snapshot: {
  id: string;
  kind: string;
  parentId: string;
  data: unknown;
}): BlockEntity {
  return {
    id: snapshot.id,
    kind: snapshot.kind as BlockEntity["kind"],
    parentId: snapshot.parentId as BlockEntity["parentId"],
    data: snapshot.data as Record<string, unknown>,
  };
}

function renderGroups(
  block: BlockEntity,
  onPick: (id: InlineActionId) => void,
) {
  const order = ["rewrite", "translate", "critique", "generate"] as const;
  const sections = order
    .map((group) => ({
      group,
      actions: INLINE_ACTIONS.filter(
        (a) => a.group === group && a.available(block),
      ),
    }))
    .filter((s) => s.actions.length > 0);

  return sections.map((s, i) => (
    <div key={s.group}>
      {i > 0 ? <CommandSeparator /> : null}
      <CommandGroup heading={s.group}>
        {s.actions.map((a) => (
          <CommandItem
            key={a.id}
            value={`${s.group} ${a.label}`}
            onSelect={() => onPick(a.id)}
          >
            <Sparkles className="size-3" />
            <span>{a.label}</span>
          </CommandItem>
        ))}
      </CommandGroup>
    </div>
  ));
}
