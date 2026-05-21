import type { PageSettings } from "../types/entity";
import type { IntentLogEntry } from "../types/intent";
import type { AppState, SliceResult } from "../types/state";

/**
 * UPDATE_PLAN_PAGE_DEFAULTS / UPDATE_SECTION_PAGE_SETTINGS 처리.
 *
 * patch 값이 undefined인 키는 해당 필드를 삭제해 상위 층으로 fall through를 보장한다.
 * (Object.assign은 undefined를 키로 쓰면 키 자체를 삭제하지 않으므로 직접 순회.)
 */
export function applyPageSettings(
  state: AppState,
  entry: IntentLogEntry,
): SliceResult | null {
  const { intent } = entry;

  if (intent.type === "UPDATE_PLAN_PAGE_DEFAULTS") {
    const plan = state.plans[intent.planId];
    if (!plan) return null;

    const current: PageSettings = { ...(plan.pageDefaults ?? {}) };
    applyPatch(current, intent.patch);

    return {
      state: {
        ...state,
        plans: {
          ...state.plans,
          [intent.planId]: { ...plan, pageDefaults: current },
        },
      },
      commands: [],
    };
  }

  if (intent.type === "UPDATE_SECTION_PAGE_SETTINGS") {
    const section = state.sections[intent.sectionId];
    if (!section) return null;

    const current: Partial<PageSettings> = { ...(section.pageSettings ?? {}) };
    applyPatch(current, intent.patch);

    return {
      state: {
        ...state,
        sections: {
          ...state.sections,
          [intent.sectionId]: { ...section, pageSettings: current },
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

  return null;
}

/**
 * patch의 undefined 값은 키 삭제(= 상속)을 의미한다.
 * defined 값은 덮어쓴다. 반환 없이 target을 직접 변경한다.
 */
function applyPatch(
  target: Partial<PageSettings>,
  patch: Partial<PageSettings>,
): void {
  for (const _key of Object.keys(patch) as (keyof PageSettings)[]) {
    const value = patch[_key];
    if (value === undefined) {
      // 키 제거 = 상위 층으로 fall through
      delete target[_key];
    } else {
      // biome-ignore lint/suspicious/noExplicitAny: heterogeneous patch assignment
      (target as any)[_key] = value;
    }
  }
}
