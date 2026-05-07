import { describe, expect, it } from "bun:test";
import { makeEmptyState, makeEntry } from "../fixtures";
import { applySections } from "../reducer/sections";
import type { SectionEntity } from "../types/entity";
import { invertSections } from "./sections";

const makeSection = (
  id: string,
  parentId: string | null = null,
): SectionEntity => ({
  id,
  planId: "p1",
  parentId,
  kind: "custom",
  title: id,
});

describe("invertSections", () => {
  it("returns null for unrelated intent", () => {
    expect(
      invertSections(makeEntry({ type: "UNDO" }), makeEmptyState()),
    ).toBeNull();
  });

  it("INSERT_SECTION → DELETE_SECTION", () => {
    expect(
      invertSections(
        makeEntry({ type: "INSERT_SECTION", section: makeSection("s1") }),
        makeEmptyState(),
      ),
    ).toEqual({ type: "DELETE_SECTION", sectionId: "s1" });
  });

  it("DELETE_SECTION leaf round-trips with index restoration", () => {
    const before = makeEmptyState({
      sections: {
        a: makeSection("a"),
        b: makeSection("b"),
        c: makeSection("c"),
      },
      docsRootIds: ["a", "b", "c"],
    });
    const forward = makeEntry({ type: "DELETE_SECTION", sectionId: "b" });
    const after = applySections(before, forward);
    if (!after) throw new Error("forward apply failed");
    const inv = invertSections(forward, before);
    expect(inv).toEqual({
      type: "INSERT_SECTION",
      section: makeSection("b"),
      index: 1,
    });
    const reverted = applySections(after.state, makeEntry(inv as never));
    expect(reverted?.state.docsRootIds).toEqual(["a", "b", "c"]);
  });

  it("DELETE_SECTION with children returns null inverse", () => {
    const before = makeEmptyState({
      sections: {
        policy: makeSection("policy"),
        general: makeSection("general", "policy"),
      },
      docsRootIds: ["policy"],
      children: { policy: ["general"] },
    });
    expect(
      invertSections(
        makeEntry({ type: "DELETE_SECTION", sectionId: "policy" }),
        before,
      ),
    ).toBeNull();
  });

  it("UPDATE_SECTION inverts to UPDATE_SECTION with prior title", () => {
    const before = makeEmptyState({
      sections: { s1: makeSection("s1") },
    });
    const forward = makeEntry({
      type: "UPDATE_SECTION",
      sectionId: "s1",
      patch: { title: "New" },
    });
    const inv = invertSections(forward, before);
    expect(inv).toEqual({
      type: "UPDATE_SECTION",
      sectionId: "s1",
      patch: { title: "s1" },
    });
  });

  it("MOVE_SECTION inverts to MOVE_SECTION back to original parent and index", () => {
    const before = makeEmptyState({
      sections: {
        a: makeSection("a"),
        b: makeSection("b"),
        c: makeSection("c"),
      },
      docsRootIds: ["a", "b", "c"],
    });
    const forward = makeEntry({
      type: "MOVE_SECTION",
      sectionId: "c",
      toParentId: "a",
      index: 0,
    });
    const inv = invertSections(forward, before);
    expect(inv).toEqual({
      type: "MOVE_SECTION",
      sectionId: "c",
      toParentId: null,
      index: 2,
    });
  });
});
