import type { IntentLogEntry } from "@/builder/types/intent";
import { httpClient, request } from "@/services/third-party-facade";
import type { PersistIntentResponse, PlanLoadResponse } from "./types";

export const plansApi = {
  // 409 (PlanLoadError) resolves successfully so the UI can render the
  // recovery dialog instead of a generic error state.
  get: async (id: string): Promise<PlanLoadResponse> => {
    const res = await httpClient.request<PlanLoadResponse>({
      method: "GET",
      url: `/plans/${id}`,
      validateStatus: (s) => s === 200 || s === 409,
    });
    return res.data;
  },
  reset: (id: string) =>
    request<{ ok: true; id: string }>({
      method: "DELETE",
      url: `/plans/${id}`,
    }),
  rawExportUrl: (id: string) => {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
    return `${base}/plans/${id}/raw`;
  },
  persistIntent: (entry: IntentLogEntry) =>
    request<PersistIntentResponse>({
      method: "POST",
      url: "/intents",
      data: entry,
    }),
};
