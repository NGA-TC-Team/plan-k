import type { IntentLogEntry } from "../types/intent";
import type { AppState, SliceResult } from "../types/state";

export function applyAgent(
  state: AppState,
  entry: IntentLogEntry,
): SliceResult | null {
  const { intent } = entry;
  switch (intent.type) {
    case "INSERT_AGENT_NODE": {
      return {
        state: {
          ...state,
          agentNodes: {
            ...state.agentNodes,
            [intent.node.id]: intent.node,
          },
          entityMeta: {
            ...state.entityMeta,
            [intent.node.id]: {
              lamport: entry.lamport,
              origin: entry.origin,
            },
          },
        },
        commands: [],
      };
    }
    case "DELETE_AGENT_NODE": {
      const nextNodes = { ...state.agentNodes };
      delete nextNodes[intent.nodeId];
      const nextEntityMeta = { ...state.entityMeta };
      delete nextEntityMeta[intent.nodeId];
      const nextEdges: typeof state.agentEdges = {};
      for (const [eid, edge] of Object.entries(state.agentEdges)) {
        if (edge.from !== intent.nodeId && edge.to !== intent.nodeId) {
          nextEdges[eid] = edge;
        }
      }
      return {
        state: {
          ...state,
          agentNodes: nextNodes,
          agentEdges: nextEdges,
          entityMeta: nextEntityMeta,
        },
        commands: [],
      };
    }
    case "CONNECT_AGENT_NODES": {
      return {
        state: {
          ...state,
          agentEdges: {
            ...state.agentEdges,
            [intent.edge.id]: intent.edge,
          },
          entityMeta: {
            ...state.entityMeta,
            [intent.edge.id]: {
              lamport: entry.lamport,
              origin: entry.origin,
            },
          },
        },
        commands: [],
      };
    }
    case "DISCONNECT_AGENT_NODES": {
      const nextEdges = { ...state.agentEdges };
      delete nextEdges[intent.edgeId];
      const nextEntityMeta = { ...state.entityMeta };
      delete nextEntityMeta[intent.edgeId];
      return {
        state: {
          ...state,
          agentEdges: nextEdges,
          entityMeta: nextEntityMeta,
        },
        commands: [],
      };
    }
    default:
      return null;
  }
}
