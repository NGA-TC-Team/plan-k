import type { IntentLogEntry } from "@/builder/types/intent";
import type { AppState } from "@/builder/types/state";

export type PlanRecord = {
  snapshot: AppState;
  tailEntries: IntentLogEntry[];
};

export type PersistIntentResponse =
  | { ok: true; serverVersion: number }
  | { ok: false; reason: string };
