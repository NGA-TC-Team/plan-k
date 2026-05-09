import { request } from "@/services/third-party-facade";
import type {
  CreatePlanVersionInput,
  PlanVersion,
  PlanVersionListItem,
} from "./types";

function versionsUrl(planId: string) {
  return `/plans/${planId}/versions`;
}

function versionUrl(planId: string, versionId: string) {
  return `/plans/${planId}/versions/${versionId}`;
}

export const planVersionsApi = {
  list: (planId: string) =>
    request<PlanVersionListItem[]>({
      method: "GET",
      url: versionsUrl(planId),
    }),

  get: (planId: string, versionId: string) =>
    request<PlanVersion>({
      method: "GET",
      url: versionUrl(planId, versionId),
    }),

  create: (planId: string, input: CreatePlanVersionInput) =>
    request<PlanVersion>({
      method: "POST",
      url: versionsUrl(planId),
      data: input,
    }),

  remove: (planId: string, versionId: string) =>
    request<void>({
      method: "DELETE",
      url: versionUrl(planId, versionId),
    }),
};
