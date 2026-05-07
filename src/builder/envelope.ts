import type {
  EntryId,
  Intent,
  IntentLogEntry,
  LamportClock,
  OriginId,
} from "./types/intent";

export type WrapContext = {
  planId: string;
  origin: OriginId;
  lamport: LamportClock;
  parentEntryId?: EntryId;
  kind?: "primary" | "inverse";
  now: () => number;
  newId: () => EntryId;
};

export function wrap<I extends Intent>(
  intent: I,
  ctx: WrapContext,
): IntentLogEntry<I> {
  return {
    id: ctx.newId(),
    planId: ctx.planId,
    origin: ctx.origin,
    lamport: ctx.lamport,
    intent,
    createdAt: ctx.now(),
    parentEntryId: ctx.parentEntryId,
    kind: ctx.kind ?? "primary",
  };
}
