import { describe, expect, it } from "bun:test";
import { makeEmptyState, makeEntry } from "../fixtures";
import type { ProjectMeta } from "../types/entity";
import { applyProjects } from "./projects";

const makeProject = (
  id: string,
  overrides: Partial<ProjectMeta> = {},
): ProjectMeta => ({
  id,
  kind: "web",
  title: "Original",
  summary: "",
  createdAt: 100,
  updatedAt: 100,
  ...overrides,
});

describe("applyProjects.UPDATE_PROJECT", () => {
  it("patches title and bumps updatedAt + entityMeta", () => {
    const state = makeEmptyState({
      projects: { p1: makeProject("p1") },
    });
    const out = applyProjects(
      state,
      makeEntry(
        {
          type: "UPDATE_PROJECT",
          projectId: "p1",
          patch: { title: "Renamed" },
        },
        { lamport: 5, origin: "human:a", createdAt: 200 },
      ),
    );
    expect(out?.state.projects.p1.title).toBe("Renamed");
    expect(out?.state.projects.p1.summary).toBe("");
    expect(out?.state.projects.p1.updatedAt).toBe(200);
    expect(out?.state.entityMeta.p1).toEqual({
      lamport: 5,
      origin: "human:a",
    });
  });

  it("patches summary independently", () => {
    const state = makeEmptyState({
      projects: { p1: makeProject("p1", { title: "Keep me" }) },
    });
    const out = applyProjects(
      state,
      makeEntry({
        type: "UPDATE_PROJECT",
        projectId: "p1",
        patch: { summary: "New summary" },
      }),
    );
    expect(out?.state.projects.p1.title).toBe("Keep me");
    expect(out?.state.projects.p1.summary).toBe("New summary");
  });

  it("returns null when project missing", () => {
    const state = makeEmptyState();
    const out = applyProjects(
      state,
      makeEntry({
        type: "UPDATE_PROJECT",
        projectId: "missing",
        patch: { title: "x" },
      }),
    );
    expect(out).toBeNull();
  });

  it("returns null for unrelated intents", () => {
    const state = makeEmptyState();
    const out = applyProjects(
      state,
      makeEntry({ type: "SELECT_NODE", nodeId: null }),
    );
    expect(out).toBeNull();
  });
});
