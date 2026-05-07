import type { ScreenEdge, ScreenEntity } from "../types/entity";
import type { Intent, IntentLogEntry } from "../types/intent";
import type { AppState } from "../types/state";

export function invertScreens(
  entry: IntentLogEntry,
  prevState: AppState,
): Intent | null {
  const { intent } = entry;
  switch (intent.type) {
    case "INSERT_SCREEN":
      return { type: "DELETE_SCREEN", screenId: intent.screen.id };

    case "DELETE_SCREEN": {
      const screen = prevState.screens[intent.screenId];
      if (!screen) return null;
      // 자식이 있으면 P3와 동일한 정책으로 null 반환 (cascade undo는 추후)
      const hasChildren =
        (prevState.children[intent.screenId]?.length ?? 0) > 0;
      if (hasChildren) return null;
      return { type: "INSERT_SCREEN", screen };
    }

    case "UPDATE_SCREEN": {
      const screen = prevState.screens[intent.screenId];
      if (!screen) return null;
      const screenMap = screen as unknown as Record<string, unknown>;
      const invertedPatch: Partial<ScreenEntity> = {};
      for (const key of Object.keys(intent.patch)) {
        if (key === "id" || key === "planId") continue;
        (invertedPatch as Record<string, unknown>)[key] = screenMap[key];
      }
      return {
        type: "UPDATE_SCREEN",
        screenId: intent.screenId,
        patch: invertedPatch,
      };
    }

    case "INSERT_SCREEN_EDGE":
      return { type: "DELETE_SCREEN_EDGE", edgeId: intent.edge.id };

    case "DELETE_SCREEN_EDGE": {
      const edge = prevState.screenEdges[intent.edgeId] as
        | ScreenEdge
        | undefined;
      if (!edge) return null;
      return { type: "INSERT_SCREEN_EDGE", edge };
    }

    default:
      return null;
  }
}
