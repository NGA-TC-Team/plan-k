"use client";

import { useEffect } from "react";
import type { FieldValues, UseFormWatch } from "react-hook-form";
import { useBuilderDispatch } from "./use-builder-store.hook";

export function useDraftSync<T extends FieldValues>(watch: UseFormWatch<T>) {
  const dispatch = useBuilderDispatch();
  useEffect(() => {
    const sub = watch((value) => {
      dispatch({ type: "CHANGE_DRAFT", value });
    });
    return () => sub.unsubscribe();
  }, [watch, dispatch]);
}
