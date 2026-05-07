import type { SectionEntity } from "../types/entity";
import type { IntentLogEntry } from "../types/intent";
import type { AppState, SliceResult } from "../types/state";

export function applySections(
  state: AppState,
  entry: IntentLogEntry,
): SliceResult | null {
  const { intent } = entry;
  switch (intent.type) {
    case "INSERT_SECTION": {
      const { section, index } = intent;
      const nextSections = { ...state.sections, [section.id]: section };
      const nextEntityMeta = {
        ...state.entityMeta,
        [section.id]: { lamport: entry.lamport, origin: entry.origin },
      };
      if (section.parentId === null) {
        const insertIdx = clamp(
          index ?? state.docsRootIds.length,
          0,
          state.docsRootIds.length,
        );
        const nextRoots = [
          ...state.docsRootIds.slice(0, insertIdx),
          section.id,
          ...state.docsRootIds.slice(insertIdx),
        ];
        return {
          state: {
            ...state,
            sections: nextSections,
            entityMeta: nextEntityMeta,
            docsRootIds: nextRoots,
          },
          commands: [],
        };
      }
      const siblings = state.children[section.parentId] ?? [];
      const insertIdx = clamp(index ?? siblings.length, 0, siblings.length);
      const nextSiblings = [
        ...siblings.slice(0, insertIdx),
        section.id,
        ...siblings.slice(insertIdx),
      ];
      return {
        state: {
          ...state,
          sections: nextSections,
          entityMeta: nextEntityMeta,
          children: { ...state.children, [section.parentId]: nextSiblings },
        },
        commands: [],
      };
    }

    case "DELETE_SECTION": {
      const section = state.sections[intent.sectionId];
      if (!section) return null;
      const toRemove = collectSectionSubtree(state, intent.sectionId);

      const nextSections = { ...state.sections };
      const nextBlocks = { ...state.blocks };
      const nextChildren = { ...state.children };
      const nextEntityMeta = { ...state.entityMeta };
      for (const id of toRemove) {
        delete nextSections[id];
        delete nextBlocks[id];
        delete nextChildren[id];
        delete nextEntityMeta[id];
      }

      let nextDocsRoots = state.docsRootIds;
      if (section.parentId === null) {
        nextDocsRoots = state.docsRootIds.filter(
          (id) => id !== intent.sectionId,
        );
      } else {
        nextChildren[section.parentId] = (
          state.children[section.parentId] ?? []
        ).filter((id) => id !== intent.sectionId);
      }

      return {
        state: {
          ...state,
          sections: nextSections,
          blocks: nextBlocks,
          children: nextChildren,
          entityMeta: nextEntityMeta,
          docsRootIds: nextDocsRoots,
        },
        commands: [],
      };
    }

    case "UPDATE_SECTION": {
      const section = state.sections[intent.sectionId];
      if (!section) return null;
      const safePatch: Partial<SectionEntity> = { ...intent.patch };
      delete safePatch.id;
      delete safePatch.planId;
      delete safePatch.parentId;
      return {
        state: {
          ...state,
          sections: {
            ...state.sections,
            [intent.sectionId]: { ...section, ...safePatch },
          },
          entityMeta: {
            ...state.entityMeta,
            [intent.sectionId]: {
              lamport: entry.lamport,
              origin: entry.origin,
            },
          },
        },
        commands: [],
      };
    }

    case "MOVE_SECTION": {
      const section = state.sections[intent.sectionId];
      if (!section) return null;
      const fromParent = section.parentId;
      const toParent = intent.toParentId;

      // remove from old container
      let nextDocsRoots = state.docsRootIds;
      const nextChildren = { ...state.children };
      if (fromParent === null) {
        nextDocsRoots = state.docsRootIds.filter(
          (id) => id !== intent.sectionId,
        );
      } else {
        nextChildren[fromParent] = (state.children[fromParent] ?? []).filter(
          (id) => id !== intent.sectionId,
        );
      }

      // insert into new container
      if (toParent === null) {
        const insertIdx = clamp(intent.index, 0, nextDocsRoots.length);
        nextDocsRoots = [
          ...nextDocsRoots.slice(0, insertIdx),
          intent.sectionId,
          ...nextDocsRoots.slice(insertIdx),
        ];
      } else {
        const targetSiblings = nextChildren[toParent] ?? [];
        const insertIdx = clamp(intent.index, 0, targetSiblings.length);
        nextChildren[toParent] = [
          ...targetSiblings.slice(0, insertIdx),
          intent.sectionId,
          ...targetSiblings.slice(insertIdx),
        ];
      }

      return {
        state: {
          ...state,
          sections: {
            ...state.sections,
            [intent.sectionId]: { ...section, parentId: toParent },
          },
          children: nextChildren,
          docsRootIds: nextDocsRoots,
          entityMeta: {
            ...state.entityMeta,
            [intent.sectionId]: {
              lamport: entry.lamport,
              origin: entry.origin,
            },
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

function collectSectionSubtree(state: AppState, rootId: string): Set<string> {
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
