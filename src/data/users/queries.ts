"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../query-keys";
import { usersApi } from "./api";
import type { ListUsersParams } from "./types";

export function useUsersQuery(params?: ListUsersParams) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => usersApi.list(params),
  });
}

export function useUserQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => usersApi.get(id),
    enabled: Boolean(id),
  });
}
