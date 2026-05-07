import { describe, expect, it } from "bun:test";
import { makeEmptyState, makeEntry } from "../fixtures";
import { applyAgent } from "../reducer/agent";
import type { AgentEdge, AgentNode } from "../types/entity";
import { invertAgent } from "./agent";

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

describe("invertAgent", () => {
  it("returns null for unrelated intent", () => {
    expect(
      invertAgent(makeEntry({ type: "UNDO" }), makeEmptyState()),
    ).toBeNull();
  });

  it("INSERT_AGENT_NODE → DELETE_AGENT_NODE", () => {
    expect(
      invertAgent(
        makeEntry({ type: "INSERT_AGENT_NODE", node: makeNode("n1") }),
        makeEmptyState(),
      ),
    ).toEqual({ type: "DELETE_AGENT_NODE", nodeId: "n1" });
  });

  it("DELETE_AGENT_NODE round-trips via INSERT_AGENT_NODE", () => {
    const before = makeEmptyState({
      agentNodes: { n1: makeNode("n1") },
    });
    const forward = makeEntry({ type: "DELETE_AGENT_NODE", nodeId: "n1" });
    const after = applyAgent(before, forward);
    if (!after) throw new Error("forward apply failed");
    const inv = invertAgent(forward, before);
    expect(inv).toEqual({ type: "INSERT_AGENT_NODE", node: makeNode("n1") });
    const reverted = applyAgent(after.state, makeEntry(inv as never));
    expect(reverted?.state.agentNodes.n1).toEqual(makeNode("n1"));
  });

  it("CONNECT_AGENT_NODES → DISCONNECT_AGENT_NODES", () => {
    expect(
      invertAgent(
        makeEntry({
          type: "CONNECT_AGENT_NODES",
          edge: makeAgentEdge("e1", "n1", "n2"),
        }),
        makeEmptyState(),
      ),
    ).toEqual({ type: "DISCONNECT_AGENT_NODES", edgeId: "e1" });
  });

  it("DISCONNECT_AGENT_NODES inverts to CONNECT_AGENT_NODES", () => {
    const edge = makeAgentEdge("e1", "n1", "n2");
    const before = makeEmptyState({
      agentNodes: { n1: makeNode("n1"), n2: makeNode("n2") },
      agentEdges: { e1: edge },
    });
    expect(
      invertAgent(
        makeEntry({ type: "DISCONNECT_AGENT_NODES", edgeId: "e1" }),
        before,
      ),
    ).toEqual({ type: "CONNECT_AGENT_NODES", edge });
  });
});
