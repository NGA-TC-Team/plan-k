"use client";

import { useEffect } from "react";
import type { IntentLogEntry } from "@/builder/types/intent";

type Args = {
  planId: string;
  origin: string;
  onRemoteIntent: (entry: IntentLogEntry) => void;
};

// Subscribes to /api/plans/[id]/stream and forwards intents from *other*
// origins as REMOTE_INTENT_RECEIVED. The originator skips its own entries
// because they are already in the local pending/history.
export function usePlanStream({ planId, origin, onRemoteIntent }: Args): void {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!origin) return; // wait until the store is initialized
    const url = `/api/plans/${encodeURIComponent(planId)}/stream`;
    const es = new EventSource(url);

    const onIntent = (event: MessageEvent<string>) => {
      try {
        const entry = JSON.parse(event.data) as IntentLogEntry;
        if (entry.origin === origin) return;
        onRemoteIntent(entry);
      } catch {
        // ignore malformed payloads — server controls shape
      }
    };

    es.addEventListener("intent", onIntent);
    return () => {
      es.removeEventListener("intent", onIntent);
      es.close();
    };
  }, [planId, origin, onRemoteIntent]);
}
