import { describe, expect, it } from "bun:test";
import { makeEmptyState, makeEntry } from "../fixtures";
import type { AgentEdge, AgentNode } from "../types/entity";
import { applyAgent } from "./agent";

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

describe("applyAgent.INSERT_AGENT_NODE", () => {
  it("inserts a node with entityMeta", () => {
    const out = applyAgent(
      makeEmptyState(),
      makeEntry(
        { type: "INSERT_AGENT_NODE", node: makeNode("n1") },
        { lamport: 3, origin: "human:a" },
      ),
    );
    expect(out?.state.agentNodes.n1).toEqual(makeNode("n1"));
    expect(out?.state.entityMeta.n1).toEqual({ lamport: 3, origin: "human:a" });
  });
});

describe("applyAgent.DELETE_AGENT_NODE", () => {
  it("removes the node and any incident edges", () => {
    const seeded = makeEmptyState({
      agentNodes: { n1: makeNode("n1"), n2: makeNode("n2") },
      agentEdges: {
        e1: makeAgentEdge("e1", "n1", "n2"),
        e2: makeAgentEdge("e2", "n2", "n1"),
      },
    });
    const out = applyAgent(
      seeded,
      makeEntry({ type: "DELETE_AGENT_NODE", nodeId: "n1" }),
    );
    expect(out?.state.agentNodes.n1).toBeUndefined();
    expect(Object.keys(out?.state.agentEdges ?? {})).toEqual([]);
  });
});

describe("applyAgent.CONNECT_AGENT_NODES", () => {
  it("inserts an edge with entityMeta", () => {
    const seeded = makeEmptyState({
      agentNodes: { n1: makeNode("n1"), n2: makeNode("n2") },
    });
    const out = applyAgent(
      seeded,
      makeEntry(
        {
          type: "CONNECT_AGENT_NODES",
          edge: makeAgentEdge("e1", "n1", "n2"),
        },
        { lamport: 7, origin: "human:b" },
      ),
    );
    expect(out?.state.agentEdges.e1).toEqual(makeAgentEdge("e1", "n1", "n2"));
    expect(out?.state.entityMeta.e1).toEqual({ lamport: 7, origin: "human:b" });
  });
});

describe("applyAgent.DISCONNECT_AGENT_NODES", () => {
  it("removes the edge and meta", () => {
    const seeded = makeEmptyState({
      agentNodes: { n1: makeNode("n1"), n2: makeNode("n2") },
      agentEdges: { e1: makeAgentEdge("e1", "n1", "n2") },
      entityMeta: { e1: { lamport: 1, origin: "human:a" } },
    });
    const out = applyAgent(
      seeded,
      makeEntry({ type: "DISCONNECT_AGENT_NODES", edgeId: "e1" }),
    );
    expect(out?.state.agentEdges.e1).toBeUndefined();
    expect(out?.state.entityMeta.e1).toBeUndefined();
  });
});
