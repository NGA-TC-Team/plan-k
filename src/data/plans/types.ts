import type { IntentLogEntry } from "@/builder/types/intent";
import type { AppState } from "@/builder/types/state";

export type PlanRecord = {
  snapshot: AppState;
  tailEntries: IntentLogEntry[];
};

export type PlanLoadError = {
  error: "MIGRATION_FAILED";
  planId: string;
  fromVersion: number;
  toVersion: number;
  message: string;
};

export type PlanLoadResponse = PlanRecord | PlanLoadError;

export function isPlanLoadError(res: PlanLoadResponse): res is PlanLoadError {
  return "error" in res;
}

export type PersistIntentResponse =
  | { ok: true; serverVersion: number }
  | { ok: false; reason: string };
