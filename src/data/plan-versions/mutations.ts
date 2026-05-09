"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../query-keys";
import { planVersionsApi } from "./api";
import type { CreatePlanVersionInput } from "./types";

export function useCreatePlanVersionMutation(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePlanVersionInput) =>
      planVersionsApi.create(planId, input),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.planVersions.list(planId),
      });
    },
  });
}

export function useDeletePlanVersionMutation(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) =>
      planVersionsApi.remove(planId, versionId),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.planVersions.list(planId),
      });
    },
  });
}
