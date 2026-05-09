"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../query-keys";
import { mediaApi } from "./api";

export function useUploadMediaMutation(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => mediaApi.upload(planId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.media.list(planId) });
      qc.invalidateQueries({ queryKey: queryKeys.media.all });
    },
  });
}

export function useCreateMediaFromUrlMutation(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => mediaApi.createFromUrl(planId, url),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.media.list(planId) });
      qc.invalidateQueries({ queryKey: queryKeys.media.all });
    },
  });
}

export function useDeleteMediaMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => mediaApi.remove(id),
    onSuccess: () => {
      // Invalidate all media lists — we don't know which planId this belongs
      // to at the call site, so bust the entire media namespace.
      qc.invalidateQueries({ queryKey: queryKeys.media.all });
    },
  });
}
