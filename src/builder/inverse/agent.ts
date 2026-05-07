import type { Intent, IntentLogEntry } from "../types/intent";
import type { AppState } from "../types/state";

export function invertAgent(
  entry: IntentLogEntry,
  prevState: AppState,
): Intent | null {
  const { intent } = entry;
  switch (intent.type) {
    case "INSERT_AGENT_NODE":
      return { type: "DELETE_AGENT_NODE", nodeId: intent.node.id };

    case "DELETE_AGENT_NODE": {
      const node = prevState.agentNodes[intent.nodeId];
      if (!node) return null;
      // 연결된 엣지가 있으면 P3 정책으로 단순 INSERT만 반환 (엣지 복원은 추후)
      return { type: "INSERT_AGENT_NODE", node };
    }

    case "CONNECT_AGENT_NODES":
      return { type: "DISCONNECT_AGENT_NODES", edgeId: intent.edge.id };

    case "DISCONNECT_AGENT_NODES": {
      const edge = prevState.agentEdges[intent.edgeId];
      if (!edge) return null;
      return { type: "CONNECT_AGENT_NODES", edge };
    }

    default:
      return null;
  }
}
