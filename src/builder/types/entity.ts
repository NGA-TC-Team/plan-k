export type BlockId = string;
export type ScreenId = string;
export type AgentNodeId = string;
export type AgentEdgeId = string;

export type DocsBlockKind =
  | "heading"
  | "paragraph"
  | "bullet-list"
  | "numbered-list"
  | "checklist"
  | "callout"
  | "canvas"
  | "code-block"
  | "blockquote"
  | "table"
  | "figure"
  | "rule"
  | "link-card"
  | "definition"
  | "decision"
  | "persona"
  | "user-story"
  | "risk"
  | "metric"
  // P7 — gap fillers for the new section kinds (roadmap, changelog, design
  // system, journeys, api). See `app-design-screen-virtual-emerson.md` plan.
  | "milestone"
  | "release-note"
  | "color-swatch"
  | "journey-step"
  | "api-endpoint"
  | "math-block"
  | "layout";

export type AppBlockKind =
  | "page-header"
  | "hero"
  | "cta-section"
  | "card-grid"
  | "form"
  | "button"
  | "input"
  | "image"
  | "text"
  | "list"
  | "sidebar"
  | "footer"
  | "tabs"
  | "modal"
  | "banner"
  | "stat"
  | "avatar"
  | "badge"
  | "divider"
  | "empty-state"
  // mobile-only
  | "status-bar"
  | "bottom-nav"
  | "list-row"
  | "fab"
  | "sheet"
  // legacy alias kept for the existing nav renderer (commit 3 transition)
  | "nav"
  | "layout";

export type AgentBlockKind = "agent-step";

export type BlockKind = DocsBlockKind | AppBlockKind | AgentBlockKind;

export type BlockContext = "docs" | "app" | "agent";

export type BlockEntity = {
  id: BlockId;
  parentId: BlockId | ScreenId | SectionId;
  kind: BlockKind;
  data: Record<string, unknown>;
  // Optional in commit 1; required after commit 2 lands the section-as-parent
  // decider tightening. Reducer stamps it on INSERT_BLOCK by inspecting the
  // parent (sections → docs unless agent-* kind, screens → app, blocks → inherit).
  context?: BlockContext;
};

export type ScreenEntity = {
  id: ScreenId;
  planId: string;
  title: string;
  route?: string;
  position?: { x: number; y: number };
  status?: SectionStatus;
};

export type ScreenEdgeId = string;

export type ScreenEdge = {
  id: ScreenEdgeId;
  from: ScreenId;
  to: ScreenId;
  label?: string;
};

export type SectionId = string;

export type SectionKind =
  | "overview"
  | "personas"
  | "glossary"
  | "policy"
  | "policy-general"
  | "policy-special"
  | "policy-writing"
  | "policy-error"
  | "business"
  | "ops"
  | "tech"
  | "api"
  | "data"
  | "risks"
  | "metrics"
  | "roadmap"
  | "changelog"
  | "security"
  | "compliance"
  | "testing"
  // web
  | "journeys"
  | "design-system"
  | "accessibility"
  | "i18n"
  | "seo"
  // agent
  | "agent-persona"
  | "agent-tools"
  | "agent-memory"
  | "agent-trigger"
  | "agent-examples"
  | "agent-failure"
  | "agent-prompt"
  | "agent-eval"
  | "agent-knowledge"
  // mobile
  | "platform"
  | "native-modules"
  | "permissions"
  | "app-store"
  | "push"
  | "deep-link"
  | "offline"
  | "custom"
  // backlog kanban — sections of this kind are NOT shown in the Docs rail;
  // they're rendered as cards in the Backlog board and edited in a Sheet.
  | "backlog";

export type EntityStatus = "pending" | "in-progress" | "approved" | "rejected";

export const ENTITY_STATUS_VALUES: readonly EntityStatus[] = [
  "pending",
  "in-progress",
  "approved",
  "rejected",
] as const;

// Backward-compat aliases — existing code referencing SectionStatus still works.
export type SectionStatus = EntityStatus;
export const SECTION_STATUS_VALUES: readonly SectionStatus[] =
  ENTITY_STATUS_VALUES;

// ── Backlog property panel types ──────────────────────────────────────────────
// Notion DB-page style key/value properties attached to a backlog section.
export type PropertyType = "text" | "number" | "date" | "select";

export type PropertyColor =
  | "default"
  | "gray"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink";

export type PropertySelectOption = {
  id: string;
  name: string;
  color: PropertyColor;
};

export type PropertyEntry = {
  id: string;
  key: string;
  type: PropertyType;
  /**
   * - text/number/date: scalar
   * - select: array of selected option ids (multi-select)
   */
  value: string | number | string[] | null;
  /** Allowed options for `select` type. */
  options?: PropertySelectOption[];
};

export type SectionEntity = {
  id: SectionId;
  planId: string;
  parentId: SectionId | null;
  kind: SectionKind;
  title: string;
  status?: SectionStatus;
  /** Backlog property panel entries (Notion DB page style). */
  properties?: PropertyEntry[];
  /**
   * 섹션별 페이지 설정 override.
   * undefined 키는 플랜 기본값 → 시스템 기본값 순으로 fall through.
   */
  pageSettings?: Partial<PageSettings>;
};

export type AgentNode = {
  id: AgentNodeId;
  role: "input" | "tool" | "llm" | "output";
  label: string;
  data: Record<string, unknown>;
};

export type AgentEdge = {
  id: AgentEdgeId;
  from: AgentNodeId;
  to: AgentNodeId;
};

export type ProjectKind = "web" | "mobile" | "agent";

export type ProjectMeta = {
  id: string;
  kind: ProjectKind;
  title: string;
  summary: string;
  createdAt: number;
  updatedAt: number;
};

/**
 * 문서 페이지 수준 설정.
 * 모든 필드는 optional — undefined는 "상위 층으로 fall through" 를 의미한다.
 * 숫자 단위: mm (0–200), opacity (0–1), angle (-180–180).
 */
export type PageSettings = {
  paddingTopMm?: number;
  paddingRightMm?: number;
  paddingBottomMm?: number;
  paddingLeftMm?: number;
  headerText?: string;
  footerText?: string;
  showPageNumbers?: boolean;
  watermarkText?: string;
  /** 0–1 */
  watermarkOpacity?: number;
  /** -180–180 degrees */
  watermarkAngleDeg?: number;
};

export type PlanShell = {
  id: string;
  projectId: string;
  kind: ProjectKind;
  meta: Record<string, unknown>;
  agentTab: "scenario" | "graph";
  /** 플랜 전역 페이지 기본값. undefined 키는 시스템 기본값으로 fall through. */
  pageDefaults?: PageSettings;
};
