import { fetchBookmarkPreview } from "@/services/third-party-facade/bookmark-preview";
import type { BookmarkPreview } from "./types";

export const bookmarksApi = {
  preview: (url: string): Promise<BookmarkPreview> => fetchBookmarkPreview(url),
};
