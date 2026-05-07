"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../query-keys";
import { usersApi } from "./api";
import type { CreateUserInput, UpdateUserInput } from "./types";

export function useCreateUserMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserInput) => usersApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users.all }),
  });
}

export function useUpdateUserMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) =>
      usersApi.update(id, input),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.users.detail(id) });
      qc.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

export function useDeleteUserMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.users.all }),
  });
}
