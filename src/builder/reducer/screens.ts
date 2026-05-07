import type { IntentLogEntry } from "../types/intent";
import type { AppState, SliceResult } from "../types/state";

export function applyScreens(
  state: AppState,
  entry: IntentLogEntry,
): SliceResult | null {
  const { intent } = entry;
  switch (intent.type) {
    case "INSERT_SCREEN": {
      return {
        state: {
          ...state,
          screens: {
            ...state.screens,
            [intent.screen.id]: intent.screen,
          },
          entityMeta: {
            ...state.entityMeta,
            [intent.screen.id]: {
              lamport: entry.lamport,
              origin: entry.origin,
            },
          },
        },
        commands: [],
      };
    }
    case "DELETE_SCREEN": {
      const nextScreens = { ...state.screens };
      delete nextScreens[intent.screenId];
      const nextChildren = { ...state.children };
      delete nextChildren[intent.screenId];
      const nextEntityMeta = { ...state.entityMeta };
      delete nextEntityMeta[intent.screenId];
      const nextScreenEdges: typeof state.screenEdges = {};
      for (const [eid, edge] of Object.entries(state.screenEdges)) {
        if (edge.from !== intent.screenId && edge.to !== intent.screenId) {
          nextScreenEdges[eid] = edge;
        }
      }
      return {
        state: {
          ...state,
          screens: nextScreens,
          children: nextChildren,
          entityMeta: nextEntityMeta,
          screenEdges: nextScreenEdges,
          currentScreenId:
            state.currentScreenId === intent.screenId
              ? null
              : state.currentScreenId,
        },
        commands: [],
      };
    }
    case "UPDATE_SCREEN": {
      const screen = state.screens[intent.screenId];
      if (!screen) return null;
      const safePatch = { ...intent.patch };
      delete safePatch.id;
      delete safePatch.planId;
      return {
        state: {
          ...state,
          screens: {
            ...state.screens,
            [intent.screenId]: { ...screen, ...safePatch },
          },
          entityMeta: {
            ...state.entityMeta,
            [intent.screenId]: {
              lamport: entry.lamport,
              origin: entry.origin,
            },
          },
        },
        commands: [],
      };
    }
    case "INSERT_SCREEN_EDGE": {
      return {
        state: {
          ...state,
          screenEdges: {
            ...state.screenEdges,
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
    case "DELETE_SCREEN_EDGE": {
      const nextEdges = { ...state.screenEdges };
      delete nextEdges[intent.edgeId];
      const nextEntityMeta = { ...state.entityMeta };
      delete nextEntityMeta[intent.edgeId];
      return {
        state: {
          ...state,
          screenEdges: nextEdges,
          entityMeta: nextEntityMeta,
        },
        commands: [],
      };
    }
    default:
      return null;
  }
}
