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
  | "metric";

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
  | "nav";

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
  | "agent-persona"
  | "agent-tools"
  | "agent-memory"
  | "agent-trigger"
  | "agent-examples"
  | "agent-failure"
  | "platform"
  | "native-modules"
  | "permissions"
  | "custom";

export type SectionEntity = {
  id: SectionId;
  planId: string;
  parentId: SectionId | null;
  kind: SectionKind;
  title: string;
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

export type PlanShell = {
  id: string;
  projectId: string;
  kind: ProjectKind;
  meta: Record<string, unknown>;
  agentTab: "scenario" | "graph";
};
