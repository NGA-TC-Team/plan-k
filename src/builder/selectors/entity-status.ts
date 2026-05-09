import type { EntityStatus } from "@/builder/types/entity";
import type { AppState } from "@/builder/types/state";

/**
 * entityMeta.status 우선, SectionEntity.status 폴백, 둘 다 없으면 undefined.
 * 모든 status read site에서 이 함수를 경유해야 신규 entityMeta 변경이 반영된다.
 */
export function getEntityStatus(
  state: AppState,
  entityId: string,
): EntityStatus | undefined {
  const meta = state.entityMeta[entityId];
  if (meta?.status !== undefined) return meta.status;
  // Legacy fallback: SectionEntity.status. Other entity kinds never had a
  // status field, so they only return entityMeta.status.
  const section = state.sections[entityId];
  return section?.status;
}

/**
 * entityMeta.status가 명시적으로 set된 모든 entityId 목록.
 * legacy section.status는 포함하지 않음 — PR-3에서 통합 결정.
 */
export function listEntityIdsWithStatus(state: AppState): string[] {
  return Object.keys(state.entityMeta).filter(
    (id) => state.entityMeta[id]?.status !== undefined,
  );
}

/**
 * entityMeta.status + section.status fallback까지 포함한 모든 tracked entityId.
 * PR-3에서 board 일반화 시 사용 가능.
 */
export function listTrackedEntityIds(state: AppState): string[] {
  const direct = new Set(listEntityIdsWithStatus(state));
  for (const [id, section] of Object.entries(state.sections)) {
    if (section.status !== undefined) direct.add(id);
  }
  return Array.from(direct);
}
