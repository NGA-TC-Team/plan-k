import { describe, expect, it } from "bun:test";
import {
  buildSeedSnapshot,
  defaultDataFor,
  defaultDocsTreeFor,
} from "./defaults";
import { deterministicIdFactory } from "./ids";

describe("defaultDocsTreeFor", () => {
  it("Web includes Glossary and Policy(+4 children) and tech/api", () => {
    const tree = defaultDocsTreeFor("web");
    const kinds = tree.map((s) => s.kind);
    expect(kinds).toContain("glossary");
    expect(kinds).toContain("policy");
    expect(kinds).toContain("tech");
    expect(kinds).toContain("api");
    const policy = tree.find((s) => s.kind === "policy");
    expect(policy?.children?.map((c) => c.kind)).toEqual([
      "policy-general",
      "policy-special",
      "policy-writing",
      "policy-error",
    ]);
  });

  it("Mobile includes platform / native-modules instead of tech/api", () => {
    const tree = defaultDocsTreeFor("mobile");
    const kinds = tree.map((s) => s.kind);
    expect(kinds).toContain("platform");
    expect(kinds).toContain("native-modules");
    expect(kinds).not.toContain("api");
  });

  it("Agent includes persona/tools/memory/trigger/examples/failure", () => {
    const tree = defaultDocsTreeFor("agent");
    const kinds = tree.map((s) => s.kind);
    expect(kinds).toContain("agent-persona");
    expect(kinds).toContain("agent-tools");
    expect(kinds).toContain("agent-memory");
    expect(kinds).toContain("agent-trigger");
    expect(kinds).toContain("agent-examples");
    expect(kinds).toContain("agent-failure");
  });

  it("All kinds include Policy with 4 children", () => {
    for (const kind of ["web", "mobile", "agent"] as const) {
      const tree = defaultDocsTreeFor(kind);
      const policy = tree.find((s) => s.kind === "policy");
      expect(policy?.children).toHaveLength(4);
    }
  });
});

describe("defaultDataFor", () => {
  it("returns kind-specific shapes for docs primitives", () => {
    expect(defaultDataFor("paragraph")).toEqual({ markdown: "" });
    expect(defaultDataFor("heading")).toEqual({ level: 1, text: "" });
    expect(defaultDataFor("bullet-list")).toEqual({
      ordered: false,
      items: [],
    });
    expect(defaultDataFor("numbered-list")).toEqual({
      ordered: true,
      items: [],
    });
    expect(defaultDataFor("callout")).toEqual({
      variant: "info",
      title: "",
      text: "",
    });
    expect(defaultDataFor("code-block")).toEqual({
      language: "ts",
      code: "",
      filename: "",
    });
    expect(defaultDataFor("rule")).toEqual({});
  });

  it("returns kind-specific shapes for app primitives", () => {
    expect(defaultDataFor("text")).toEqual({ markdown: "" });
    expect(defaultDataFor("list")).toEqual({ ordered: false, items: [] });
    expect(defaultDataFor("hero")).toEqual({
      title: "",
      subtitle: "",
      cta: "",
    });
    expect(defaultDataFor("card-grid")).toEqual({ columns: 3, cards: [] });
    expect(defaultDataFor("form")).toEqual({ fields: [] });
    expect(defaultDataFor("nav")).toEqual({ items: [] });
    expect(defaultDataFor("agent-step")).toEqual({ role: "input", spec: {} });
  });
});

describe("buildSeedSnapshot", () => {
  it("Web seed has docsRootIds + sections + one initial screen", () => {
    const ids = deterministicIdFactory();
    const state = buildSeedSnapshot("plan-web", "web", {
      newId: ids.newEntryId,
      origin: "human:seed",
    });
    expect(state.docsRootIds.length).toBeGreaterThan(0);
    expect(Object.keys(state.sections).length).toBeGreaterThan(
      state.docsRootIds.length,
    );
    expect(Object.keys(state.screens)).toHaveLength(1);
    expect(state.currentScreenId).not.toBeNull();
    expect(state.plans["plan-web"]?.kind).toBe("web");
  });

  it("Agent seed has no screens but has docs", () => {
    const ids = deterministicIdFactory();
    const state = buildSeedSnapshot("plan-agent", "agent", {
      newId: ids.newEntryId,
      origin: "human:seed",
    });
    expect(Object.keys(state.screens)).toHaveLength(0);
    expect(state.currentScreenId).toBeNull();
    expect(state.docsRootIds.length).toBeGreaterThan(0);
  });

  it("Policy section in seed has 4 child sections under children map", () => {
    const ids = deterministicIdFactory();
    const state = buildSeedSnapshot("p-web", "web", {
      newId: ids.newEntryId,
      origin: "human:seed",
    });
    const policyId = Object.values(state.sections).find(
      (s) => s.kind === "policy",
    )?.id;
    if (!policyId) throw new Error("policy section missing");
    const childIds = state.children[policyId] ?? [];
    expect(childIds).toHaveLength(4);
    const childKinds = childIds
      .map((id) => state.sections[id]?.kind)
      .filter(Boolean);
    expect(childKinds).toEqual([
      "policy-general",
      "policy-special",
      "policy-writing",
      "policy-error",
    ]);
  });
});
