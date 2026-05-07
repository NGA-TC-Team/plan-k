"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../query-keys";
import { projectsApi } from "./api";

export function useCreateProjectMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useDeleteProjectMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}
