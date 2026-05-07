"use client";

import { type ReactNode, useRef } from "react";
import { toast } from "sonner";
import { hydrate } from "@/builder/hydrate";
import { defaultIdFactory } from "@/builder/ids";
import { createBuilderStore } from "@/builder/store";
import { usePersistIntentMutation } from "@/data/plans/mutations";
import { usePlanQuery } from "@/data/plans/queries";
import { BuilderContext, type BuilderStoreHook } from "./builder-context";

type Props = {
  planId: string;
  children: ReactNode;
};

export function BuilderProvider({ planId, children }: Props) {
  const planQuery = usePlanQuery(planId);
  const persistIntent = usePersistIntentMutation();

  const persistRef = useRef(persistIntent);
  persistRef.current = persistIntent;

  const storeRef = useRef<BuilderStoreHook | null>(null);

  if (planQuery.data && !storeRef.current) {
    const ids = defaultIdFactory();
    const origin = ids.newOriginId("human");
    const initialState = hydrate(
      planQuery.data.snapshot,
      planQuery.data.tailEntries,
    );
    storeRef.current = createBuilderStore({
      planId,
      origin,
      initialState: { ...initialState, origin },
      effects: {
        persistIntent: (entry) => {
          persistRef.current.mutate(entry);
        },
        emitToast: (level, message) => {
          if (level === "error") toast.error(message);
          else if (level === "warn") toast.warning(message);
          else toast.message(message);
        },
      },
    });
  }

  if (planQuery.isLoading || !storeRef.current) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading plan…
      </div>
    );
  }
  if (planQuery.error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-destructive">
        Failed to load plan: {String(planQuery.error)}
      </div>
    );
  }

  return (
    <BuilderContext.Provider value={storeRef.current}>
      {children}
    </BuilderContext.Provider>
  );
}
