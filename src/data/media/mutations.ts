"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useChatStore } from "@/services/stores";
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

/**
 * Promote a chat attachment to the plan media library.
 *
 * On success:
 *  1. Invalidates the media list query so the library panel refreshes.
 *  2. Patches the Zustand chat store so the attachment card switches from
 *     "Use in plan" to "✓ In library" without waiting for an SSE round-trip.
 *     (Chat attachments live as snapshots in Zustand, not in TanStack Query.)
 */
export function usePromoteAttachmentMutation(
  planId: string,
  sessionId: string,
) {
  const qc = useQueryClient();
  const setAttachmentMediaId = useChatStore((s) => s.setAttachmentMediaId);
  return useMutation({
    mutationFn: (attachmentId: string) =>
      mediaApi.promoteAttachment(attachmentId),
    onSuccess: (data, attachmentId) => {
      // Refresh media library panel.
      qc.invalidateQueries({ queryKey: queryKeys.media.list(planId) });
      qc.invalidateQueries({ queryKey: queryKeys.media.all });
      // Patch Zustand so the chat UI updates immediately.
      setAttachmentMediaId(sessionId, attachmentId, data.media.id);
    },
  });
}
