"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../query-keys";
import { planVersionsApi } from "./api";

export function usePlanVersionsQuery(planId: string) {
  return useQuery({
    queryKey: queryKeys.planVersions.list(planId),
    queryFn: () => planVersionsApi.list(planId),
    enabled: Boolean(planId),
  });
}

export function usePlanVersionQuery(planId: string, versionId: string) {
  return useQuery({
    queryKey: queryKeys.planVersions.detail(planId, versionId),
    queryFn: () => planVersionsApi.get(planId, versionId),
    enabled: Boolean(planId) && Boolean(versionId),
  });
}
