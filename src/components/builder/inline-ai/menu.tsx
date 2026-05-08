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
  const groups = groupActions(block);
  const anyAvailable = groups.some((g) => g.actions.length > 0);
  const addSession = useInlineAiStore((s) => s.addSession);
  const setOpen = useInlineAiStore((s) => s.setOpen);
  if (!anyAvailable) return null;

  const onPick = async (actionId: InlineActionId) => {
    const t = toast.loading("Sending to AI…");
    try {
      const res = await request<{
        ok: boolean;
        sessionId: string;
        reason?: string;
      }>({
        method: "POST",
        url: "/inline-ai",
        data: { planId, blockId: block.id, actionId },
      });
      if (!res.ok) {
        toast.error(`Action failed: ${res.reason ?? "unknown"}`, { id: t });
        return;
      }
      addSession(res.sessionId);
      toast.success("Action sent", {
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
        <span>AI Actions</span>
      </ContextMenuSubTrigger>
      <ContextMenuPortal>
        <ContextMenuSubContent>
          {groups.map((group, gi) => {
            if (group.actions.length === 0) return null;
            return (
              <div key={group.id}>
                {gi > 0 ? <ContextMenuSeparator /> : null}
                <ContextMenuLabel className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
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

function groupActions(block: BlockEntity) {
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
    actions: INLINE_ACTIONS.filter((a) => a.group === id && a.available(block)),
  }));
}
