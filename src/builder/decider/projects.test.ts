import { describe, expect, it } from "bun:test";
import { makeEmptyState, makeEntry } from "../fixtures";
import type { ProjectMeta } from "../types/entity";
import { decideProjects } from "./projects";

const makeProject = (
  id: string,
  overrides: Partial<ProjectMeta> = {},
): ProjectMeta => ({
  id,
  kind: "web",
  title: "T",
  summary: "",
  createdAt: 100,
  updatedAt: 100,
  ...overrides,
});

describe("decideProjects.UPDATE_PROJECT", () => {
  it("accepts when project exists and lamport advances", () => {
    const state = makeEmptyState({
      projects: { p1: makeProject("p1") },
      entityMeta: { p1: { lamport: 1, origin: "human:a" } },
    });
    const out = decideProjects(
      state,
      makeEntry(
        {
          type: "UPDATE_PROJECT",
          projectId: "p1",
          patch: { title: "x" },
        },
        { lamport: 2, origin: "human:a" },
      ),
    );
    expect(out).toEqual({ ok: true });
  });

  it("rejects NOT_FOUND when project missing", () => {
    const state = makeEmptyState();
    const out = decideProjects(
      state,
      makeEntry({
        type: "UPDATE_PROJECT",
        projectId: "missing",
        patch: { title: "x" },
      }),
    );
    expect(out).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("rejects STALE_LAMPORT when older lamport", () => {
    const state = makeEmptyState({
      projects: { p1: makeProject("p1") },
      entityMeta: { p1: { lamport: 5, origin: "human:b" } },
    });
    const out = decideProjects(
      state,
      makeEntry(
        {
          type: "UPDATE_PROJECT",
          projectId: "p1",
          patch: { title: "x" },
        },
        { lamport: 3, origin: "human:a" },
      ),
    );
    expect(out).toEqual({ ok: false, reason: "STALE_LAMPORT" });
  });

  it("returns null for unrelated intents", () => {
    const state = makeEmptyState();
    const out = decideProjects(
      state,
      makeEntry({ type: "SELECT_NODE", nodeId: null }),
    );
    expect(out).toBeNull();
  });
});
