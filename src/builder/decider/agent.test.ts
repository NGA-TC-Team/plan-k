import { describe, expect, it } from "bun:test";
import { makeEmptyState, makeEntry } from "../fixtures";
import type { AgentEdge, AgentNode } from "../types/entity";
import { decideAgent } from "./agent";

const makeNode = (
  id: string,
  role: AgentNode["role"] = "input",
): AgentNode => ({
  id,
  role,
  label: id,
  data: {},
});

const makeAgentEdge = (id: string, from: string, to: string): AgentEdge => ({
  id,
  from,
  to,
});

describe("decideAgent.INSERT_AGENT_NODE", () => {
  it("returns null for unrelated intent", () => {
    expect(
      decideAgent(makeEmptyState(), makeEntry({ type: "UNDO" })),
    ).toBeNull();
  });

  it("accepts a fresh node", () => {
    expect(
      decideAgent(
        makeEmptyState(),
        makeEntry({ type: "INSERT_AGENT_NODE", node: makeNode("n1") }),
      ),
    ).toEqual({ ok: true });
  });

  it("rejects re-insert with non-greater Lamport", () => {
    const state = makeEmptyState({
      agentNodes: { n1: makeNode("n1") },
      entityMeta: { n1: { lamport: 5, origin: "human:a" } },
    });
    expect(
      decideAgent(
        state,
        makeEntry(
          { type: "INSERT_AGENT_NODE", node: makeNode("n1") },
          { lamport: 5, origin: "human:a" },
        ),
      ),
    ).toEqual({ ok: false, reason: "STALE_LAMPORT" });
  });
});

describe("decideAgent.DELETE_AGENT_NODE", () => {
  it("rejects missing node", () => {
    expect(
      decideAgent(
        makeEmptyState(),
        makeEntry({ type: "DELETE_AGENT_NODE", nodeId: "ghost" }),
      ),
    ).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("accepts existing node", () => {
    const state = makeEmptyState({
      agentNodes: { n1: makeNode("n1") },
    });
    expect(
      decideAgent(
        state,
        makeEntry({ type: "DELETE_AGENT_NODE", nodeId: "n1" }),
      ),
    ).toEqual({ ok: true });
  });
});

describe("decideAgent.CONNECT/DISCONNECT_AGENT_NODES", () => {
  const stateWithNodes = () =>
    makeEmptyState({
      agentNodes: { n1: makeNode("n1"), n2: makeNode("n2") },
    });

  it("CONNECT rejects unknown from", () => {
    expect(
      decideAgent(
        stateWithNodes(),
        makeEntry({
          type: "CONNECT_AGENT_NODES",
          edge: makeAgentEdge("e1", "ghost", "n2"),
        }),
      ),
    ).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("CONNECT accepts valid edge", () => {
    expect(
      decideAgent(
        stateWithNodes(),
        makeEntry({
          type: "CONNECT_AGENT_NODES",
          edge: makeAgentEdge("e1", "n1", "n2"),
        }),
      ),
    ).toEqual({ ok: true });
  });

  it("DISCONNECT rejects unknown edgeId", () => {
    expect(
      decideAgent(
        stateWithNodes(),
        makeEntry({ type: "DISCONNECT_AGENT_NODES", edgeId: "ghost" }),
      ),
    ).toEqual({ ok: false, reason: "NOT_FOUND" });
  });
});
