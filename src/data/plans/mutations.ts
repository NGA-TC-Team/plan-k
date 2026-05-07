"use client";

import { useMutation } from "@tanstack/react-query";
import { plansApi } from "./api";

export function usePersistIntentMutation() {
  return useMutation({
    mutationFn: plansApi.persistIntent,
  });
}
