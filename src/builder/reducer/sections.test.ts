import { describe, expect, it } from "bun:test";
import { makeEmptyState, makeEntry } from "../fixtures";
import type { SectionEntity } from "../types/entity";
import { applySections } from "./sections";

const makeSection = (
  id: string,
  parentId: string | null = null,
  kind: SectionEntity["kind"] = "custom",
): SectionEntity => ({
  id,
  planId: "p1",
  parentId,
  kind,
  title: id,
});

describe("applySections.INSERT_SECTION", () => {
  it("appends a top-level section to docsRootIds when index omitted", () => {
    const seeded = makeEmptyState({
      sections: { sec0: makeSection("sec0") },
      docsRootIds: ["sec0"],
    });
    const out = applySections(
      seeded,
      makeEntry({ type: "INSERT_SECTION", section: makeSection("sec1") }),
    );
    expect(out?.state.docsRootIds).toEqual(["sec0", "sec1"]);
    expect(out?.state.sections.sec1).toEqual(makeSection("sec1"));
  });

  it("inserts at given index in docsRootIds", () => {
    const seeded = makeEmptyState({
      sections: {
        a: makeSection("a"),
        b: makeSection("b"),
      },
      docsRootIds: ["a", "b"],
    });
    const out = applySections(
      seeded,
      makeEntry({
        type: "INSERT_SECTION",
        section: makeSection("c"),
        index: 1,
      }),
    );
    expect(out?.state.docsRootIds).toEqual(["a", "c", "b"]);
  });

  it("inserts a child section into children[parentId]", () => {
    const seeded = makeEmptyState({
      sections: { policy: makeSection("policy", null, "policy") },
      docsRootIds: ["policy"],
    });
    const out = applySections(
      seeded,
      makeEntry({
        type: "INSERT_SECTION",
        section: makeSection("p-general", "policy", "policy-general"),
      }),
    );
    expect(out?.state.children.policy).toEqual(["p-general"]);
  });
});

describe("applySections.DELETE_SECTION", () => {
  it("removes top-level section + cascades children", () => {
    const seeded = makeEmptyState({
      sections: {
        policy: makeSection("policy", null, "policy"),
        general: makeSection("general", "policy", "policy-general"),
        special: makeSection("special", "policy", "policy-special"),
      },
      docsRootIds: ["policy"],
      children: { policy: ["general", "special"] },
    });
    const out = applySections(
      seeded,
      makeEntry({ type: "DELETE_SECTION", sectionId: "policy" }),
    );
    expect(out?.state.sections.policy).toBeUndefined();
    expect(out?.state.sections.general).toBeUndefined();
    expect(out?.state.sections.special).toBeUndefined();
    expect(out?.state.docsRootIds).toEqual([]);
    expect(out?.state.children.policy).toBeUndefined();
  });

  it("removes nested section from children[parent]", () => {
    const seeded = makeEmptyState({
      sections: {
        policy: makeSection("policy", null, "policy"),
        general: makeSection("general", "policy", "policy-general"),
      },
      docsRootIds: ["policy"],
      children: { policy: ["general"] },
    });
    const out = applySections(
      seeded,
      makeEntry({ type: "DELETE_SECTION", sectionId: "general" }),
    );
    expect(out?.state.children.policy).toEqual([]);
  });
});

describe("applySections.UPDATE_SECTION", () => {
  it("merges title and ignores forbidden fields", () => {
    const seeded = makeEmptyState({
      sections: { sec1: makeSection("sec1") },
      docsRootIds: ["sec1"],
    });
    const out = applySections(
      seeded,
      makeEntry({
        type: "UPDATE_SECTION",
        sectionId: "sec1",
        patch: {
          title: "Renamed",
          id: "ghost",
          planId: "ghost",
          parentId: "ghost",
        },
      }),
    );
    expect(out?.state.sections.sec1?.title).toBe("Renamed");
    expect(out?.state.sections.sec1?.id).toBe("sec1");
    expect(out?.state.sections.sec1?.parentId).toBeNull();
  });
});

describe("applySections.MOVE_SECTION", () => {
  it("moves a top-level section into a parent at index", () => {
    const seeded = makeEmptyState({
      sections: {
        a: makeSection("a"),
        b: makeSection("b"),
      },
      docsRootIds: ["a", "b"],
    });
    const out = applySections(
      seeded,
      makeEntry({
        type: "MOVE_SECTION",
        sectionId: "b",
        toParentId: "a",
        index: 0,
      }),
    );
    expect(out?.state.docsRootIds).toEqual(["a"]);
    expect(out?.state.children.a).toEqual(["b"]);
    expect(out?.state.sections.b?.parentId).toBe("a");
  });

  it("moves a child section back to root at index", () => {
    const seeded = makeEmptyState({
      sections: {
        a: makeSection("a"),
        b: makeSection("b", "a"),
      },
      docsRootIds: ["a"],
      children: { a: ["b"] },
    });
    const out = applySections(
      seeded,
      makeEntry({
        type: "MOVE_SECTION",
        sectionId: "b",
        toParentId: null,
        index: 0,
      }),
    );
    expect(out?.state.docsRootIds).toEqual(["b", "a"]);
    expect(out?.state.children.a).toEqual([]);
    expect(out?.state.sections.b?.parentId).toBeNull();
  });
});
