import type { SectionEntity } from "../types/entity";
import type { Intent, IntentLogEntry } from "../types/intent";
import type { AppState } from "../types/state";

export function invertSections(
  entry: IntentLogEntry,
  prevState: AppState,
): Intent | null {
  const { intent } = entry;
  switch (intent.type) {
    case "INSERT_SECTION":
      return { type: "DELETE_SECTION", sectionId: intent.section.id };

    case "DELETE_SECTION": {
      const section = prevState.sections[intent.sectionId];
      if (!section) return null;
      // 자식 있으면 P3 정책 그대로 null
      const hasChildren =
        (prevState.children[intent.sectionId]?.length ?? 0) > 0;
      if (hasChildren) return null;

      let index: number | undefined;
      if (section.parentId === null) {
        const idx = prevState.docsRootIds.indexOf(intent.sectionId);
        index = idx >= 0 ? idx : undefined;
      } else {
        const siblings = prevState.children[section.parentId] ?? [];
        const idx = siblings.indexOf(intent.sectionId);
        index = idx >= 0 ? idx : undefined;
      }
      return { type: "INSERT_SECTION", section, index };
    }

    case "UPDATE_SECTION": {
      const section = prevState.sections[intent.sectionId];
      if (!section) return null;
      const sectionMap = section as unknown as Record<string, unknown>;
      const invertedPatch: Partial<SectionEntity> = {};
      for (const key of Object.keys(intent.patch)) {
        if (key === "id" || key === "planId" || key === "parentId") continue;
        (invertedPatch as Record<string, unknown>)[key] = sectionMap[key];
      }
      return {
        type: "UPDATE_SECTION",
        sectionId: intent.sectionId,
        patch: invertedPatch,
      };
    }

    case "MOVE_SECTION": {
      const section = prevState.sections[intent.sectionId];
      if (!section) return null;
      const prevParent = section.parentId;
      let prevIndex = 0;
      if (prevParent === null) {
        prevIndex = prevState.docsRootIds.indexOf(intent.sectionId);
      } else {
        prevIndex = (prevState.children[prevParent] ?? []).indexOf(
          intent.sectionId,
        );
      }
      return {
        type: "MOVE_SECTION",
        sectionId: intent.sectionId,
        toParentId: prevParent,
        index: prevIndex >= 0 ? prevIndex : 0,
      };
    }

    default:
      return null;
  }
}
