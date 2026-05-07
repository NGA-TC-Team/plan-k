import type { BlockContext, BlockEntity } from "../types/entity";
import type { IntentLogEntry } from "../types/intent";
import type { AppState, SliceResult } from "../types/state";

function inferBlockContext(state: AppState, parentId: string): BlockContext {
  if (parentId in state.blocks) {
    const parent = state.blocks[parentId];
    return parent.context ?? "app";
  }
  if (parentId in state.sections) {
    const section = state.sections[parentId];
    return section.kind.startsWith("agent-") ? "agent" : "docs";
  }
  if (parentId in state.screens) return "app";
  return "app";
}

export function applyStructure(
  state: AppState,
  entry: IntentLogEntry,
): SliceResult | null {
  const { intent } = entry;
  switch (intent.type) {
    case "INSERT_BLOCK": {
      const { parentId, block, index } = intent;
      const context = block.context ?? inferBlockContext(state, parentId);
      const newBlock: BlockEntity = { ...block, parentId, context };

      let nextBlocks = state.blocks;
      let nextChildren = state.children;

      const existing = state.blocks[block.id];
      if (existing) {
        const oldParent = existing.parentId;
        nextChildren = {
          ...nextChildren,
          [oldParent]: (nextChildren[oldParent] ?? []).filter(
            (id) => id !== block.id,
          ),
        };
      }

      const targetSiblings =
        parentId === existing?.parentId
          ? (nextChildren[parentId] ?? [])
          : (state.children[parentId] ?? []);

      const insertIdx =
        index === undefined
          ? targetSiblings.length
          : clamp(index, 0, targetSiblings.length);

      const newSiblings = [
        ...targetSiblings.slice(0, insertIdx),
        block.id,
        ...targetSiblings.slice(insertIdx),
      ];

      nextChildren = { ...nextChildren, [parentId]: newSiblings };
      nextBlocks = { ...nextBlocks, [block.id]: newBlock };

      return {
        state: {
          ...state,
          blocks: nextBlocks,
          children: nextChildren,
          entityMeta: {
            ...state.entityMeta,
            [block.id]: { lamport: entry.lamport, origin: entry.origin },
          },
        },
        commands: [],
      };
    }

    case "MOVE_BLOCK": {
      const { nodeId, toParentId, index } = intent;
      const block = state.blocks[nodeId];
      if (!block) return null;

      const fromParent = block.parentId;
      const oldSiblingsFiltered = (state.children[fromParent] ?? []).filter(
        (id) => id !== nodeId,
      );

      const baseSiblings =
        toParentId === fromParent
          ? oldSiblingsFiltered
          : (state.children[toParentId] ?? []);
      const insertIdx = clamp(index, 0, baseSiblings.length);
      const newSiblings = [
        ...baseSiblings.slice(0, insertIdx),
        nodeId,
        ...baseSiblings.slice(insertIdx),
      ];

      const nextChildren = {
        ...state.children,
        [fromParent]: oldSiblingsFiltered,
        [toParentId]: newSiblings,
      };

      return {
        state: {
          ...state,
          blocks: {
            ...state.blocks,
            [nodeId]: { ...block, parentId: toParentId },
          },
          children: nextChildren,
          entityMeta: {
            ...state.entityMeta,
            [nodeId]: { lamport: entry.lamport, origin: entry.origin },
          },
        },
        commands: [],
      };
    }

    case "DELETE_BLOCK": {
      const { nodeId } = intent;
      const block = state.blocks[nodeId];
      if (!block) return null;

      const toRemove = collectSubtree(state, nodeId);

      const nextBlocks = { ...state.blocks };
      const nextEntityMeta = { ...state.entityMeta };
      const nextChildren = { ...state.children };
      for (const id of toRemove) {
        delete nextBlocks[id];
        delete nextEntityMeta[id];
        delete nextChildren[id];
      }

      nextChildren[block.parentId] = (
        nextChildren[block.parentId] ?? []
      ).filter((id) => id !== nodeId);

      return {
        state: {
          ...state,
          blocks: nextBlocks,
          children: nextChildren,
          entityMeta: nextEntityMeta,
        },
        commands: [],
      };
    }

    case "UPDATE_BLOCK": {
      const { nodeId, patch } = intent;
      const block = state.blocks[nodeId];
      if (!block) return null;

      const safePatch: Partial<BlockEntity> = { ...patch };
      delete safePatch.id;
      delete safePatch.parentId;

      return {
        state: {
          ...state,
          blocks: {
            ...state.blocks,
            [nodeId]: { ...block, ...safePatch },
          },
          entityMeta: {
            ...state.entityMeta,
            [nodeId]: { lamport: entry.lamport, origin: entry.origin },
          },
        },
        commands: [],
      };
    }

    default:
      return null;
  }
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(Math.max(value, lo), hi);
}

function collectSubtree(state: AppState, rootId: string): Set<string> {
  const result = new Set<string>([rootId]);
  const queue: string[] = [...(state.children[rootId] ?? [])];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === undefined) break;
    result.add(cur);
    queue.push(...(state.children[cur] ?? []));
  }
  return result;
}
