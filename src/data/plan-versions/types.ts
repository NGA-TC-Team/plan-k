// Client-side types for plan version snapshots.
// Time fields use number (timestamp_ms) to mirror the DB integer columns.

export type PlanVersion = {
  id: string;
  planId: string;
  label: string;
  note: string;
  snapshot: string; // full hydrated AppState JSON
  serverSeqAtTag: number;
  createdAt: number; // timestamp_ms
};

// List responses never include the snapshot field (payload reduction).
export type PlanVersionListItem = Omit<PlanVersion, "snapshot">;

export type CreatePlanVersionInput = {
  label: string;
  note?: string;
};
