import type { EntryId, OriginId } from "./types/intent";

export type IdFactory = {
  newEntryId: () => EntryId;
  newOriginId: (label: "human" | "claude") => OriginId;
};

export function defaultIdFactory(): IdFactory {
  return {
    newEntryId: () => crypto.randomUUID(),
    newOriginId: (label) => `${label}:${crypto.randomUUID()}`,
  };
}

export function deterministicIdFactory(seed = 0): IdFactory {
  let counter = seed;
  return {
    newEntryId: () => `entry-${++counter}`,
    newOriginId: (label) => `${label}:${++counter}`,
  };
}
