"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../query-keys";
import { bookmarksApi } from "./api";

export function useBookmarkPreviewQuery(url: string) {
  return useQuery({
    queryKey: queryKeys.bookmarks.preview(url),
    queryFn: () => bookmarksApi.preview(url),
    enabled: !!url && (url.startsWith("http://") || url.startsWith("https://")),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}
