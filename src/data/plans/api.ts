import type { IntentLogEntry } from "@/builder/types/intent";
import { request } from "@/services/third-party-facade";
import type { PersistIntentResponse, PlanRecord } from "./types";

export const plansApi = {
  get: (id: string) =>
    request<PlanRecord>({ method: "GET", url: `/plans/${id}` }),
  persistIntent: (entry: IntentLogEntry) =>
    request<PersistIntentResponse>({
      method: "POST",
      url: "/intents",
      data: entry,
    }),
};
