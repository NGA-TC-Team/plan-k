"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../query-keys";
import { plansApi } from "./api";

export function usePlanQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.plans.detail(id),
    queryFn: () => plansApi.get(id),
    enabled: Boolean(id),
    staleTime: Number.POSITIVE_INFINITY,
  });
}
