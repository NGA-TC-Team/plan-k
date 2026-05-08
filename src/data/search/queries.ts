"use client";

import { useQuery } from "@tanstack/react-query";
import { request } from "@/services/third-party-facade";

export type SearchHit =
  | {
      kind: "project";
      planId: string;
      projectTitle: string;
      field: "title" | "summary";
      snippet: string;
      refDepth: 0 | 1 | 2;
    }
  | {
      kind: "section";
      planId: string;
      projectTitle: string;
      sectionId: string;
      sectionTitle: string;
      snippet: string;
      refDepth: 0 | 1 | 2;
    }
  | {
      kind: "block";
      planId: string;
      projectTitle: string;
      blockId: string;
      blockKind: string;
      sectionId: string | null;
      snippet: string;
      refDepth: 0 | 1 | 2;
    };

type Response = { query: string; hits: SearchHit[] };

// Palette-facing search hook. Disabled when the query is short/empty so
// every keystroke doesn't fire a request; cmdk's local filter handles
// the actions group while this query feeds the "Search" group below.
export function useSearchQuery(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["search", trimmed],
    queryFn: () =>
      request<Response>({
        method: "GET",
        url: "/search",
        params: { q: trimmed },
      }),
    enabled: trimmed.length >= 2,
    staleTime: 5_000,
  });
}
