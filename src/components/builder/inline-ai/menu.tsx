"use client";

import { Languages, Pencil, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import type { BlockEntity } from "@/builder/types/entity";
import {
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { useBuilderStateShallow } from "@/hooks/builder/use-builder-store.hook";
import { useInlineAiStore } from "@/services/stores";
import { request } from "@/services/third-party-facade";
import {
  INLINE_ACTIONS,
  type InlineAction,
  type InlineActionId,
} from "./actions";

type Props = {
  planId: string;
  block: BlockEntity;
};

// Renders the AI Actions sub-tree of the block context menu. Use this
// inside an existing <ContextMenu> + <ContextMenuTrigger> wrapper —
// see BlockShell for the typical mount point.
export function InlineAiMenu({ planId, block }: Props) {
  // When the user has a multi-selection that includes the
  // right-clicked block, treat the action as a bulk operation.
  // Otherwise the right-click only addresses the single block.
  const multiIds = useBuilderStateShallow((s) =>
    s.state.selection.kind === "multi" &&
    s.state.selection.ids.includes(block.id)
      ? s.state.selection.ids
      : null,
  );
  const isBulk = Boolean(multiIds && multiIds.length > 1);
  const groups = groupActions(block, isBulk);
  const anyAvailable = groups.some((g) => g.actions.length > 0);
  const addSession = useInlineAiStore((s) => s.addSession);
  const setOpen = useInlineAiStore((s) => s.setOpen);
  if (!anyAvailable) return null;

  const onPick = async (actionId: InlineActionId) => {
    const target = isBulk ? { blockIds: multiIds } : { blockId: block.id };
    const t = toast.loading(
      isBulk ? `Sending ${multiIds?.length} blocks to AI…` : "Sending to AI…",
    );
    try {
      const res = await request<{
        ok: boolean;
        sessionId: string;
        reason?: string;
        blockCount?: number;
      }>({
        method: "POST",
        url: "/inline-ai",
        data: { planId, ...target, actionId },
      });
      if (!res.ok) {
        toast.error(`Action failed: ${res.reason ?? "unknown"}`, { id: t });
        return;
      }
      addSession(res.sessionId);
      toast.success(`Action sent (${res.blockCount ?? 1} blocks)`, {
        id: t,
        action: {
          label: "Review",
          onClick: () => setOpen(true),
        },
      });
    } catch (err) {
      toast.error(
        `Action failed: ${err instanceof Error ? err.message : String(err)}`,
        { id: t },
      );
    }
  };

  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger>
        <Sparkles className="size-3.5" />
        <span>
          {isBulk ? `AI Actions (${multiIds?.length})` : "AI Actions"}
        </span>
      </ContextMenuSubTrigger>
      <ContextMenuPortal>
        <ContextMenuSubContent>
          {groups.map((group, gi) => {
            if (group.actions.length === 0) return null;
            return (
              <div key={group.id}>
                {gi > 0 ? <ContextMenuSeparator /> : null}
                <ContextMenuLabel className="flex items-center gap-1.5 text-caption font-medium uppercase tracking-eyebrow text-muted-foreground">
                  <group.icon className="size-3" />
                  <span>{group.heading}</span>
                </ContextMenuLabel>
                <ContextMenuGroup>
                  {group.actions.map((action) => (
                    <ContextMenuItem
                      key={action.id}
                      onClick={() => onPick(action.id)}
                    >
                      {action.label}
                    </ContextMenuItem>
                  ))}
                </ContextMenuGroup>
              </div>
            );
          })}
        </ContextMenuSubContent>
      </ContextMenuPortal>
    </ContextMenuSub>
  );
}

const GROUP_META: Record<
  InlineAction["group"],
  { heading: string; icon: typeof Sparkles }
> = {
  rewrite: { heading: "Rewrite", icon: Pencil },
  translate: { heading: "Translate", icon: Languages },
  critique: { heading: "Critique", icon: Sparkles },
  generate: { heading: "Generate", icon: Wand2 },
};

function groupActions(block: BlockEntity, isBulk: boolean) {
  const order: InlineAction["group"][] = [
    "rewrite",
    "translate",
    "critique",
    "generate",
  ];
  return order.map((id) => ({
    id,
    heading: GROUP_META[id].heading,
    icon: GROUP_META[id].icon,
    actions: INLINE_ACTIONS.filter(
      (a) => a.group === id && a.available(block) && (!isBulk || a.bulkable),
    ),
  }));
}
