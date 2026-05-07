import { request } from "@/services/third-party-facade";
import type { CreateProjectInput, Project } from "./types";

const RESOURCE = "/projects";

export const projectsApi = {
  list: () => request<Project[]>({ method: "GET", url: RESOURCE }),
  create: (input: CreateProjectInput) =>
    request<Project>({ method: "POST", url: RESOURCE, data: input }),
  remove: (id: string) =>
    request<{ ok: true }>({
      method: "DELETE",
      url: `${RESOURCE}/${id}`,
    }),
};
