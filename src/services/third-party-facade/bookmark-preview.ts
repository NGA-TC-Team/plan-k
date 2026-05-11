import { request } from "./axios";

export type BookmarkPreview = {
  title: string;
  description: string;
  faviconUrl: string;
};

/**
 * Calls the internal `/api/bookmark/preview` route handler via the project's
 * HTTP facade.  All network/parsing errors surface as thrown exceptions from
 * `request<T>()`.
 */
export async function fetchBookmarkPreview(
  url: string,
): Promise<BookmarkPreview> {
  return request<BookmarkPreview>({
    method: "POST",
    url: "/bookmark/preview",
    data: { url },
  });
}
