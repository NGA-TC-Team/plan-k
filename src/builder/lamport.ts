import type { LamportClock, OriginId } from "./types/intent";

export type Stamp = { lamport: LamportClock; origin: OriginId };

export function tick(local: LamportClock): LamportClock {
  return local + 1;
}

export function merge(
  local: LamportClock,
  incoming: LamportClock,
): LamportClock {
  return Math.max(local, incoming) + 1;
}

export function compareStamps(a: Stamp, b: Stamp): number {
  if (a.lamport !== b.lamport) return a.lamport < b.lamport ? -1 : 1;
  if (a.origin === b.origin) return 0;
  return a.origin < b.origin ? -1 : 1;
}

export function isStrictlyGreater(candidate: Stamp, baseline: Stamp): boolean {
  return compareStamps(candidate, baseline) > 0;
}
