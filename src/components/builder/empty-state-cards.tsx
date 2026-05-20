"use client";

import type { LucideIcon } from "lucide-react";
import { BLOCK_ICONS } from "@/builder/blocks/icons";
import {
  getSuggestedKinds,
  type SuggestedKind,
} from "@/builder/blocks/suggested";
import type { BlockKind } from "@/builder/types/entity";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

type Props = {
  context: "docs" | "app" | "agent";
  onPick: (kind: BlockKind) => void;
};

function SuggestionCard({
  item,
  onPick,
}: {
  item: SuggestedKind;
  onPick: (kind: BlockKind) => void;
}) {
  // BLOCK_ICONS is keyed by BlockKind; icon field is always the kind string.
  const Icon: LucideIcon = BLOCK_ICONS[item.icon] ?? BLOCK_ICONS.paragraph;

  return (
    <button
      type="button"
      onClick={() => onPick(item.kind)}
      className={cn(
        "group flex flex-col gap-2 rounded-lg border bg-card p-4 text-left",
        "transition-colors hover:border-primary/50 hover:bg-accent",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
        <span className="text-sm font-medium leading-none">{item.label}</span>
        {item.shortcut && <Kbd className="ml-auto">{item.shortcut}</Kbd>}
      </div>
      <p className="text-xs text-muted-foreground leading-snug">
        {item.description}
      </p>
    </button>
  );
}

/**
 * Quick-start card grid shown in place of an empty section or screen canvas.
 * Renders suggested blocks for the given context; clicking a card calls onPick.
 */
export function EmptyStateCards({ context, onPick }: Props) {
  const suggestions = getSuggestedKinds(context);

  // Safety: if no suggestions (e.g. agent context), fall back to a plain message.
  if (suggestions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Add a block to get started.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-6">
      <div className="text-center">
        <p className="text-caption font-medium uppercase tracking-eyebrow text-muted-foreground">
          Quick-start
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a block to begin
        </p>
      </div>
      <div className="grid w-full max-w-lg grid-cols-2 gap-3">
        {suggestions.map((item) => (
          <SuggestionCard key={item.kind} item={item} onPick={onPick} />
        ))}
      </div>
    </div>
  );
}
