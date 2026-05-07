"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../query-keys";
import { projectsApi } from "./api";

export function useProjectsQuery() {
  return useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: () => projectsApi.list(),
  });
}
