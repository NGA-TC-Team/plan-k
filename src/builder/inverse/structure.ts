import type { BlockEntity } from "../types/entity";
import type { Intent, IntentLogEntry } from "../types/intent";
import type { AppState } from "../types/state";

export function invertStructure(
  entry: IntentLogEntry,
  prevState: AppState,
): Intent | null {
  const { intent } = entry;
  switch (intent.type) {
    case "INSERT_BLOCK": {
      return { type: "DELETE_BLOCK", nodeId: intent.block.id };
    }

    case "MOVE_BLOCK": {
      const block = prevState.blocks[intent.nodeId];
      if (!block) return null;
      const prevSiblings = prevState.children[block.parentId] ?? [];
      const prevIndex = prevSiblings.indexOf(intent.nodeId);
      return {
        type: "MOVE_BLOCK",
        nodeId: intent.nodeId,
        toParentId: block.parentId,
        index: prevIndex >= 0 ? prevIndex : 0,
      };
    }

    case "DELETE_BLOCK": {
      const block = prevState.blocks[intent.nodeId];
      if (!block) return null;
      const hasChildren = (prevState.children[intent.nodeId]?.length ?? 0) > 0;
      if (hasChildren) return null;
      const siblings = prevState.children[block.parentId] ?? [];
      const idx = siblings.indexOf(intent.nodeId);
      return {
        type: "INSERT_BLOCK",
        parentId: block.parentId,
        block,
        index: idx >= 0 ? idx : undefined,
      };
    }

    case "UPDATE_BLOCK": {
      const block = prevState.blocks[intent.nodeId];
      if (!block) return null;
      const blockMap = block as unknown as Record<string, unknown>;
      const invertedPatch: Record<string, unknown> = {};
      for (const key of Object.keys(intent.patch)) {
        if (key === "id" || key === "parentId") continue;
        invertedPatch[key] = blockMap[key];
      }
      return {
        type: "UPDATE_BLOCK",
        nodeId: intent.nodeId,
        patch: invertedPatch as Partial<BlockEntity>,
      };
    }

    default:
      return null;
  }
}
