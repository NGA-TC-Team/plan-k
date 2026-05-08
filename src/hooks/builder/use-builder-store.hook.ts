"use client";

import { useContext } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { BuilderStore } from "@/builder/store";
import { BuilderContext } from "@/components/builder/builder-context";

function useBuilderStoreHook() {
  const hook = useContext(BuilderContext);
  if (!hook) {
    throw new Error("useBuilderStore must be used inside <BuilderProvider>");
  }
  return hook;
}

export function useBuilderState<T>(selector: (state: BuilderStore) => T): T {
  const hook = useBuilderStoreHook();
  return useStore(hook, selector);
}

export function useBuilderStateShallow<T>(
  selector: (state: BuilderStore) => T,
): T {
  const hook = useBuilderStoreHook();
  return useStore(hook, useShallow(selector));
}

export function useBuilderDispatch() {
  return useBuilderState((s) => s.dispatch);
}

// Returns the builder store hook if mounted inside a BuilderProvider,
// otherwise null. Useful for global overlays (command palette, keymap)
// that should compose builder-scoped actions without crashing on routes
// where the builder is absent.
export function useOptionalBuilderStore() {
  return useContext(BuilderContext);
}
