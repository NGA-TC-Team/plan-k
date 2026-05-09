import { describe, expect, it } from "bun:test";
import { makeEmptyState } from "@/builder/fixtures";
import {
  getEntityStatus,
  listEntityIdsWithStatus,
  listTrackedEntityIds,
} from "./entity-status";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function withEntityMeta(
  state: ReturnType<typeof makeEmptyState>,
  entityId: string,
  meta: Partial<(typeof state.entityMeta)[string]>,
) {
  return {
    ...state,
    entityMeta: {
      ...state.entityMeta,
      [entityId]: {
        lamport: 1,
        origin: "human:test" as const,
        ...meta,
      },
    },
  };
}

function withSection(
  state: ReturnType<typeof makeEmptyState>,
  entityId: string,
  status?: import("@/builder/types/entity").EntityStatus,
) {
  return {
    ...state,
    sections: {
      ...state.sections,
      [entityId]: {
        id: entityId,
        planId: "p1",
        parentId: null,
        kind: "backlog" as const,
        title: "Card",
        ...(status !== undefined ? { status } : {}),
      },
    },
  };
}

// ---------------------------------------------------------------------------
// getEntityStatus
// ---------------------------------------------------------------------------

describe("getEntityStatus", () => {
  it("returns entityMeta.status when set", () => {
    const state = withEntityMeta(makeEmptyState(), "e1", {
      status: "in-progress",
    });
    expect(getEntityStatus(state, "e1")).toBe("in-progress");
  });

  it("returns section.status as fallback when entityMeta has no status", () => {
    const state = withSection(makeEmptyState(), "s1", "approved");
    expect(getEntityStatus(state, "s1")).toBe("approved");
  });

  it("prefers entityMeta.status over section.status", () => {
    let state = withSection(makeEmptyState(), "s1", "pending");
    state = withEntityMeta(state, "s1", { status: "rejected" });
    expect(getEntityStatus(state, "s1")).toBe("rejected");
  });

  it("returns undefined when neither entityMeta.status nor section.status exists", () => {
    expect(getEntityStatus(makeEmptyState(), "ghost")).toBeUndefined();
  });

  it("returns undefined when entityMeta exists but status is not set", () => {
    const state = withEntityMeta(makeEmptyState(), "e1", {});
    expect(getEntityStatus(state, "e1")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// listEntityIdsWithStatus
// ---------------------------------------------------------------------------

describe("listEntityIdsWithStatus", () => {
  it("returns entityIds where entityMeta.status is defined", () => {
    let state = makeEmptyState();
    state = withEntityMeta(state, "e1", { status: "pending" });
    state = withEntityMeta(state, "e2", {}); // no status
    state = withEntityMeta(state, "e3", { status: "approved" });
    const ids = listEntityIdsWithStatus(state);
    expect(ids.sort()).toEqual(["e1", "e3"]);
  });

  it("does NOT include ids whose section.status is set but entityMeta.status is missing", () => {
    const state = withSection(makeEmptyState(), "s1", "pending");
    expect(listEntityIdsWithStatus(state)).toEqual([]);
  });

  it("returns empty array when no entityMeta entries exist", () => {
    expect(listEntityIdsWithStatus(makeEmptyState())).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// listTrackedEntityIds
// ---------------------------------------------------------------------------

describe("listTrackedEntityIds", () => {
  it("includes both entityMeta.status ids and section.status fallback ids", () => {
    let state = makeEmptyState();
    state = withEntityMeta(state, "e1", { status: "pending" });
    state = withSection(state, "s1", "in-progress"); // fallback only
    const ids = listTrackedEntityIds(state);
    expect(ids.sort()).toEqual(["e1", "s1"]);
  });

  it("does not duplicate when both entityMeta.status and section.status are set", () => {
    let state = makeEmptyState();
    state = withSection(state, "s1", "pending");
    state = withEntityMeta(state, "s1", { status: "approved" });
    const ids = listTrackedEntityIds(state);
    expect(ids).toEqual(["s1"]); // deduplicated
  });

  it("excludes entities with no status in either location", () => {
    let state = makeEmptyState();
    state = withEntityMeta(state, "e1", {}); // no status
    state = withSection(state, "s1"); // no status
    expect(listTrackedEntityIds(state)).toEqual([]);
  });
});
