"use client";

import type { BlockRenderer } from "../types";

type Card = { title?: string; desc?: string };

export const CardGridDetail: BlockRenderer = ({ vm }) => {
  const columns = ((vm.displayValue.columns as number) ?? 3) || 1;
  const cards = (vm.displayValue.cards as Card[]) ?? [];
  if (cards.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        Empty card grid · {columns} columns
      </div>
    );
  }
  return (
    <div
      className="grid gap-3 py-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {cards.map((card, i) => (
        <div key={`${vm.id}-${i}`} className="rounded-lg border p-3">
          <div className="font-medium">
            {card.title ?? (
              <span className="italic text-muted-foreground">Card title</span>
            )}
          </div>
          {card.desc ? (
            <div className="mt-1 text-sm text-muted-foreground">
              {card.desc}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};
