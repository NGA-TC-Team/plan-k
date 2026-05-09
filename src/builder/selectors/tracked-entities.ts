import { manifestFor } from "@/builder/blocks/registry";
import type { BlockKind, EntityStatus } from "@/builder/types/entity";
import type { AppState } from "@/builder/types/state";
import { getEntityStatus, listTrackedEntityIds } from "./entity-status";

export type TrackedEntityKind = "section" | "block" | "screen" | "agent-node";

export type TrackedEntity = {
  id: string;
  kind: TrackedEntityKind;
  status: EntityStatus;
  /** 짧은 카드 제목 */
  title: string;
  /** 부모 경로(읽기 전용 표시용). e.g. "Docs / Foo / Hero" */
  path: string;
  /** 세부 jump를 위한 부모 id (PR-4 이후 클릭 navigation에 활용). */
  parentId?: string;
};

// ──────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ──────────────────────────────────────────────────────────────────────────────

/** block.data에서 title 추출. manifest label 우선, data.title/data.text fallback. */
function blockTitle(kind: BlockKind, data: Record<string, unknown>): string {
  try {
    const m = manifestFor(kind);
    if (m.label) return m.label;
  } catch {
    // unknown kind — fall through to data fields
  }
  if (typeof data.title === "string" && data.title.trim()) return data.title;
  if (typeof data.text === "string" && data.text.trim())
    return data.text.slice(0, 60);
  return "Block";
}

/** section ancestor chain → "Root / Child / …" */
function sectionPath(state: AppState, sectionId: string): string {
  const parts: string[] = [];
  let current = state.sections[sectionId];
  if (!current) return "";
  // Walk up at most 10 levels to avoid infinite loops on bad data.
  let hops = 0;
  while (current && hops < 10) {
    parts.unshift(current.title || "(untitled)");
    if (!current.parentId) break;
    current = state.sections[current.parentId];
    hops++;
  }
  // Drop the leaf itself — path shows ancestors only.
  if (parts.length > 1) parts.pop();
  return parts.join(" / ");
}

/** block의 parent chain: 소속 section or screen title을 조합. */
function blockPath(state: AppState, block: AppState["blocks"][string]): string {
  const parentSection = state.sections[block.parentId];
  if (parentSection) {
    const secPath = sectionPath(state, parentSection.id);
    return secPath
      ? `${secPath} / ${parentSection.title || "(untitled)"}`
      : parentSection.title || "(untitled)";
  }
  const parentScreen = state.screens[block.parentId];
  if (parentScreen) {
    return `App / ${parentScreen.title || parentScreen.route || "(untitled)"}`;
  }
  // nested block — walk up to find a section/screen
  const parentBlock = state.blocks[block.parentId];
  if (parentBlock) {
    return blockPath(state, parentBlock);
  }
  return "";
}

/** plan title for agent-node path */
function planTitle(state: AppState): string {
  const plan = Object.values(state.plans)[0];
  const project = plan ? state.projects[plan.projectId] : undefined;
  return project?.title || "Agent";
}

// ──────────────────────────────────────────────────────────────────────────────
// Status sort order
// ──────────────────────────────────────────────────────────────────────────────

const STATUS_ORDER: Record<EntityStatus, number> = {
  "in-progress": 0,
  pending: 1,
  approved: 2,
  rejected: 3,
};

const KIND_ORDER: Record<TrackedEntityKind, number> = {
  section: 0,
  screen: 1,
  block: 2,
  "agent-node": 3,
};

// ──────────────────────────────────────────────────────────────────────────────
// Public selector
// ──────────────────────────────────────────────────────────────────────────────

/**
 * status가 설정된 모든 entity를 TrackedEntity 목록으로 변환.
 * 정렬: status 순서 → kind 순서 → title alphabetical.
 */
export function listTrackedEntities(state: AppState): TrackedEntity[] {
  const ids = listTrackedEntityIds(state);
  const result: TrackedEntity[] = [];

  for (const id of ids) {
    const status = getEntityStatus(state, id);
    if (status === undefined) continue; // paranoia — listTrackedEntityIds filters this

    // ── section ──
    const section = state.sections[id];
    if (section) {
      result.push({
        id,
        kind: "section",
        status,
        title: section.title || "(untitled)",
        path: sectionPath(state, id),
        parentId: section.parentId ?? undefined,
      });
      continue;
    }

    // ── block ──
    const block = state.blocks[id];
    if (block) {
      result.push({
        id,
        kind: "block",
        status,
        title: blockTitle(block.kind, block.data),
        path: blockPath(state, block),
        parentId: block.parentId,
      });
      continue;
    }

    // ── screen ──
    const screen = state.screens[id];
    if (screen) {
      result.push({
        id,
        kind: "screen",
        status,
        title: screen.title || screen.route || "(untitled)",
        path: screen.route ? `App / ${screen.route}` : "App",
        parentId: undefined,
      });
      continue;
    }

    // ── agent-node ──
    const agentNode = state.agentNodes[id];
    if (agentNode) {
      result.push({
        id,
        kind: "agent-node",
        status,
        title: agentNode.label || "(untitled)",
        path: `${planTitle(state)} / ${agentNode.role}`,
        parentId: undefined,
      });
    }

    // orphan entityMeta — skip silently
  }

  result.sort((a, b) => {
    const sd = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (sd !== 0) return sd;
    const kd = KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    if (kd !== 0) return kd;
    return a.title.localeCompare(b.title);
  });

  return result;
}
