"use client";

import { ArrowDownLeft, Link2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useBacklinksQuery } from "@/data/plans/backlinks";
import { useBuilderState } from "@/hooks/builder/use-builder-store.hook";

const KIND_BADGE: Record<string, string> = {
  mention: "@",
  embed: "[[ ]]",
  "depends-on": ">>",
  trace: "~",
  media: "img",
};

type Props = {
  dstId: string;
  onSelect?: (srcId: string) => void;
};

// Inbound references to `dstId`. Renders nothing while loading or when
// the list is empty so it doesn't take up space in the inspect panel
// for blocks with no backlinks (the common case).
export function BacklinksPanel({ dstId, onSelect }: Props) {
  const params = useParams();
  const planId = typeof params.id === "string" ? params.id : null;
  const dispatch = useBuilderState((s) => s.dispatch);
  const query = useBacklinksQuery(planId ?? "", dstId);

  if (!planId) return null;
  if (query.isLoading || !query.data) return null;
  const refs = query.data.refs;
  if (refs.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-1.5 text-caption font-semibold uppercase tracking-eyebrow text-muted-foreground">
        <Link2 className="size-3" />
        <span>Backlinks ({refs.length})</span>
      </h2>
      <ul className="space-y-1.5">
        {refs.map((row) => (
          <li key={`${row.srcId}::${row.kind}`}>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "SELECT_NODE", nodeId: row.srcId });
                onSelect?.(row.srcId);
              }}
              className="flex w-full items-start gap-2 rounded-md border border-transparent bg-muted/40 px-2 py-1.5 text-left text-xs transition-colors hover:border-border hover:bg-muted"
            >
              <span className="mt-0.5 text-muted-foreground">
                <ArrowDownLeft className="size-3" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block truncate font-medium">{row.label}</span>
                {row.path.length > 0 ? (
                  <span className="block truncate text-caption text-muted-foreground">
                    {row.path.join(" › ")}
                  </span>
                ) : null}
              </span>
              <span className="rounded bg-background px-1.5 py-0.5 font-mono text-caption text-muted-foreground">
                {KIND_BADGE[row.kind] ?? row.kind}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
