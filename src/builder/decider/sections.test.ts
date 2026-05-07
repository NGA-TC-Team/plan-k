import { describe, expect, it } from "bun:test";
import { makeEmptyState, makeEntry } from "../fixtures";
import type { SectionEntity } from "../types/entity";
import { decideSections } from "./sections";

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

describe("decideSections.INSERT_SECTION", () => {
  it("returns null for unrelated intent", () => {
    expect(
      decideSections(makeEmptyState(), makeEntry({ type: "UNDO" })),
    ).toBeNull();
  });

  it("accepts a top-level section", () => {
    expect(
      decideSections(
        makeEmptyState(),
        makeEntry({ type: "INSERT_SECTION", section: makeSection("sec1") }),
      ),
    ).toEqual({ ok: true });
  });

  it("rejects nested section under a missing parent", () => {
    expect(
      decideSections(
        makeEmptyState(),
        makeEntry({
          type: "INSERT_SECTION",
          section: makeSection("sec1", "ghost"),
        }),
      ),
    ).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("accepts nested section under existing parent", () => {
    const state = makeEmptyState({
      sections: { policy: makeSection("policy") },
      docsRootIds: ["policy"],
    });
    expect(
      decideSections(
        state,
        makeEntry({
          type: "INSERT_SECTION",
          section: makeSection("p-general", "policy"),
        }),
      ),
    ).toEqual({ ok: true });
  });
});

describe("decideSections.UPDATE/DELETE/MOVE", () => {
  const seeded = () =>
    makeEmptyState({
      sections: {
        sec1: makeSection("sec1"),
        sec2: makeSection("sec2"),
      },
      docsRootIds: ["sec1", "sec2"],
    });

  it("UPDATE rejects missing", () => {
    expect(
      decideSections(
        makeEmptyState(),
        makeEntry({ type: "UPDATE_SECTION", sectionId: "ghost", patch: {} }),
      ),
    ).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("DELETE rejects missing", () => {
    expect(
      decideSections(
        makeEmptyState(),
        makeEntry({ type: "DELETE_SECTION", sectionId: "ghost" }),
      ),
    ).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("MOVE rejects when toParent missing", () => {
    expect(
      decideSections(
        seeded(),
        makeEntry({
          type: "MOVE_SECTION",
          sectionId: "sec1",
          toParentId: "ghost",
          index: 0,
        }),
      ),
    ).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("MOVE rejects with CYCLIC_MOVE on self", () => {
    expect(
      decideSections(
        seeded(),
        makeEntry({
          type: "MOVE_SECTION",
          sectionId: "sec1",
          toParentId: "sec1",
          index: 0,
        }),
      ),
    ).toEqual({ ok: false, reason: "CYCLIC_MOVE" });
  });

  it("MOVE rejects with CYCLIC_MOVE into descendant", () => {
    const state = makeEmptyState({
      sections: {
        a: makeSection("a"),
        b: makeSection("b", "a"),
        c: makeSection("c", "b"),
      },
      docsRootIds: ["a"],
      children: { a: ["b"], b: ["c"] },
    });
    expect(
      decideSections(
        state,
        makeEntry({
          type: "MOVE_SECTION",
          sectionId: "a",
          toParentId: "c",
          index: 0,
        }),
      ),
    ).toEqual({ ok: false, reason: "CYCLIC_MOVE" });
  });

  it("MOVE accepts a valid move to root", () => {
    expect(
      decideSections(
        seeded(),
        makeEntry({
          type: "MOVE_SECTION",
          sectionId: "sec1",
          toParentId: null,
          index: 1,
        }),
      ),
    ).toEqual({ ok: true });
  });
});
