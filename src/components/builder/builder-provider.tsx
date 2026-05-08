"use client";

import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { hydrate } from "@/builder/hydrate";
import { defaultIdFactory } from "@/builder/ids";
import { createBuilderStore } from "@/builder/store";
import type { IntentLogEntry } from "@/builder/types/intent";
import { useChatBindings } from "@/data/chat/use-chat-bindings";
import { usePersistIntentMutation } from "@/data/plans/mutations";
import { usePlanQuery } from "@/data/plans/queries";
import { isPlanLoadError } from "@/data/plans/types";
import { usePlanStream } from "@/hooks/builder/use-plan-stream.hook";
import {
  affectedNodeIdsFor,
  isAgentOrigin,
  useActiveBuilderStore,
  useAiFlashStore,
  useSaveStatusStore,
} from "@/services/stores";
import { BuilderContext, type BuilderStoreHook } from "./builder-context";
import { PlanRecoveryDialog } from "./plan-recovery-dialog";

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
  const originRef = useRef<string | null>(null);

  if (planQuery.data && !isPlanLoadError(planQuery.data) && !storeRef.current) {
    const ids = defaultIdFactory();
    const origin = ids.newOriginId("human");
    originRef.current = origin;
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
          const save = useSaveStatusStore.getState();
          save.begin();
          persistRef.current.mutate(entry, {
            onSuccess: (res) => {
              if (res && "ok" in res && res.ok === false) {
                useSaveStatusStore.getState().fail(res.reason);
              } else {
                useSaveStatusStore.getState().succeed();
              }
            },
            onError: (err) => {
              const msg = err instanceof Error ? err.message : String(err);
              useSaveStatusStore.getState().fail(msg);
            },
          });
        },
        emitToast: (level, message) => {
          if (level === "error") toast.error(message);
          else if (level === "warn") toast.warning(message);
          else toast.message(message);
        },
      },
    });
  }

  const onRemoteIntent = useCallback((entry: IntentLogEntry) => {
    storeRef.current
      ?.getState()
      .dispatch({ type: "REMOTE_INTENT_RECEIVED", entry });
    if (entry.kind === "primary" && isAgentOrigin(entry.origin)) {
      const ids = affectedNodeIdsFor(entry.intent);
      if (ids.length > 0) useAiFlashStore.getState().flash(ids);
    }
  }, []);

  usePlanStream({
    planId,
    origin: originRef.current ?? "",
    onRemoteIntent,
  });

  // Mirror the live store into useActiveBuilderStore so global overlays
  // (Cmd+. inline AI picker, future shortcut handlers) can reach the
  // builder without depending on BuilderContext, which doesn't reach
  // siblings of the route's children.
  const builderHook = storeRef.current;
  useEffect(() => {
    if (!builderHook) return;
    useActiveBuilderStore.getState().setStore(builderHook);
    return () => {
      useActiveBuilderStore.getState().setStore(null);
    };
  }, [builderHook]);

  if (planQuery.data && isPlanLoadError(planQuery.data)) {
    return <PlanRecoveryDialog detail={planQuery.data} />;
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
      <ChatBindings planId={planId} />
      {children}
    </BuilderContext.Provider>
  );
}

function ChatBindings({ planId }: { planId: string }) {
  // Hooks that require BuilderContext live in a child so they only mount
  // once the store is ready.
  useChatBindings(planId);
  return null;
}
