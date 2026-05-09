"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../query-keys";
import { mediaApi } from "./api";

export function useMediaListQuery(planId: string) {
  return useQuery({
    queryKey: queryKeys.media.list(planId),
    queryFn: () => mediaApi.list(planId),
    // Guard against empty string and whitespace-only strings — both produce a
    // malformed URL like `/api/plans//media` or `/api/plans/   /media`.
    enabled: planId.trim().length > 0,
    // Return a stable empty array while loading to avoid reference churn.
    select: (data) => data.items,
  });
}
