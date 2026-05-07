import { describe, expect, it } from "bun:test";
import { makeEmptyState, makeEntry } from "../fixtures";
import type { ProjectMeta } from "../types/entity";
import { invertProjects } from "./projects";

const makeProject = (
  id: string,
  overrides: Partial<ProjectMeta> = {},
): ProjectMeta => ({
  id,
  kind: "web",
  title: "Original",
  summary: "Old summary",
  createdAt: 100,
  updatedAt: 100,
  ...overrides,
});

describe("invertProjects.UPDATE_PROJECT", () => {
  it("inverts a title patch back to the previous title", () => {
    const state = makeEmptyState({
      projects: { p1: makeProject("p1") },
    });
    const result = invertProjects(
      makeEntry({
        type: "UPDATE_PROJECT",
        projectId: "p1",
        patch: { title: "Renamed" },
      }),
      state,
    );
    expect(result).toEqual({
      type: "UPDATE_PROJECT",
      projectId: "p1",
      patch: { title: "Original" },
    });
  });

  it("inverts only the keys present in the patch", () => {
    const state = makeEmptyState({
      projects: { p1: makeProject("p1") },
    });
    const result = invertProjects(
      makeEntry({
        type: "UPDATE_PROJECT",
        projectId: "p1",
        patch: { summary: "New" },
      }),
      state,
    );
    expect(result).toEqual({
      type: "UPDATE_PROJECT",
      projectId: "p1",
      patch: { summary: "Old summary" },
    });
  });

  it("returns null when project missing", () => {
    const result = invertProjects(
      makeEntry({
        type: "UPDATE_PROJECT",
        projectId: "missing",
        patch: { title: "x" },
      }),
      makeEmptyState(),
    );
    expect(result).toBeNull();
  });

  it("returns null for unrelated intents", () => {
    const result = invertProjects(
      makeEntry({ type: "SELECT_NODE", nodeId: null }),
      makeEmptyState(),
    );
    expect(result).toBeNull();
  });
});

describe("invertProjects.DELETE_PROJECT", () => {
  it("returns null — delete is irreversible (plan + log are cascade-deleted)", () => {
    const state = makeEmptyState({
      projects: { p1: makeProject("p1") },
    });
    const result = invertProjects(
      makeEntry({ type: "DELETE_PROJECT", projectId: "p1" }),
      state,
    );
    expect(result).toBeNull();
  });
});
