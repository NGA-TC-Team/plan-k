import { request } from "@/services/third-party-facade";
import type { MediaItem } from "./types";

export const mediaApi = {
  list: (planId: string) =>
    request<{ items: MediaItem[] }>({
      method: "GET",
      url: `/plans/${planId}/media`,
    }),

  upload: (planId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<{ media: MediaItem }>({
      method: "POST",
      url: `/plans/${planId}/media`,
      data: form,
      // Setting Content-Type to `undefined` causes axios to DELETE the header
      // key before sending, which lets the browser (XHR / fetch) generate the
      // correct `multipart/form-data; boundary=...` value automatically.
      // Do NOT set a literal "multipart/form-data" string here — that omits the
      // boundary parameter and the server will reject the body.
      headers: { "Content-Type": undefined },
    });
  },

  remove: (id: string) =>
    request<void>({ method: "DELETE", url: `/media/${id}` }),
};
