"use client";

import { useQuery } from "@tanstack/react-query";
import { request } from "@/services/third-party-facade";
import { queryKeys } from "../query-keys";

export type BacklinkRow = {
  srcId: string;
  kind: "mention" | "embed" | "depends-on" | "trace";
  label: string;
  path: string[];
};

type Response = {
  planId: string;
  dstId: string;
  refs: BacklinkRow[];
};

// Backlinks are derived state — refetch when selection changes but cache
// briefly so toggling between two entities doesn't thrash. The server
// rebuilds on every appendIntent so a 2s staleTime is fine; we don't
// invalidate proactively.
export function useBacklinksQuery(planId: string, dstId: string | null) {
  return useQuery({
    queryKey: queryKeys.plans.backlinks(planId, dstId ?? ""),
    queryFn: () =>
      request<Response>({
        method: "GET",
        url: `/plans/${planId}/refs/incoming`,
        params: { dst: dstId },
      }),
    enabled: Boolean(planId && dstId),
    staleTime: 2_000,
  });
}
