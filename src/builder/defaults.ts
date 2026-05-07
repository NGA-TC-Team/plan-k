import type {
  BlockContext,
  BlockKind,
  ProjectKind,
  SectionEntity,
  SectionKind,
} from "./types/entity";
import type { OriginId } from "./types/intent";
import { type AppState, SCHEMA_VERSION } from "./types/state";

export type SectionSeedSpec = {
  kind: SectionKind;
  title: string;
  children?: SectionSeedSpec[];
};

export function defaultDocsTreeFor(kind: ProjectKind): SectionSeedSpec[] {
  const policySection: SectionSeedSpec = {
    kind: "policy",
    title: "Policy",
    children: [
      { kind: "policy-general", title: "General handling" },
      { kind: "policy-special", title: "Special situations" },
      { kind: "policy-writing", title: "Writing & tone" },
      { kind: "policy-error", title: "Error messages" },
    ],
  };

  const sharedFront: SectionSeedSpec[] = [
    { kind: "overview", title: "Overview" },
  ];

  const sharedBack: SectionSeedSpec[] = [
    { kind: "business", title: "Business plan" },
    { kind: "ops", title: "Ops & lifecycle" },
  ];

  switch (kind) {
    case "web":
      return [
        ...sharedFront,
        { kind: "personas", title: "Personas" },
        { kind: "glossary", title: "Glossary" },
        policySection,
        ...sharedBack,
        { kind: "tech", title: "Tech architecture" },
        { kind: "api", title: "API design" },
        { kind: "data", title: "Data model" },
        { kind: "risks", title: "Risks & assumptions" },
        { kind: "metrics", title: "Metrics & KPIs" },
      ];
    case "mobile":
      return [
        ...sharedFront,
        { kind: "personas", title: "Personas" },
        { kind: "glossary", title: "Glossary" },
        policySection,
        ...sharedBack,
        { kind: "platform", title: "Platform spec (iOS / Android)" },
        { kind: "native-modules", title: "Native modules & permissions" },
        { kind: "data", title: "Data model" },
        { kind: "risks", title: "Risks & assumptions" },
        { kind: "metrics", title: "Metrics & KPIs" },
      ];
    case "agent":
      return [
        ...sharedFront,
        { kind: "agent-persona", title: "Agent persona" },
        { kind: "glossary", title: "Glossary" },
        policySection,
        ...sharedBack,
        { kind: "agent-tools", title: "Tools spec" },
        { kind: "agent-memory", title: "Memory model" },
        { kind: "agent-trigger", title: "Trigger conditions" },
        { kind: "agent-examples", title: "Sample interactions" },
        { kind: "agent-failure", title: "Failure modes" },
        { kind: "risks", title: "Risks & assumptions" },
        { kind: "metrics", title: "Metrics & KPIs" },
      ];
  }
}

export type BlockKindSpec = {
  context: BlockContext;
  kind: BlockKind;
  label: string;
  group: string;
  platform?: "mobile";
};

export const BLOCK_KIND_REGISTRY: BlockKindSpec[] = [
  // ────────── docs (document writing primitives — distinct from app) ──────────
  { context: "docs", kind: "heading", label: "Heading", group: "Prose" },
  { context: "docs", kind: "paragraph", label: "Paragraph", group: "Prose" },
  { context: "docs", kind: "blockquote", label: "Blockquote", group: "Prose" },
  { context: "docs", kind: "callout", label: "Callout", group: "Prose" },
  { context: "docs", kind: "code-block", label: "Code block", group: "Prose" },
  {
    context: "docs",
    kind: "bullet-list",
    label: "Bullet list",
    group: "Lists",
  },
  {
    context: "docs",
    kind: "numbered-list",
    label: "Numbered list",
    group: "Lists",
  },
  { context: "docs", kind: "checklist", label: "Checklist", group: "Lists" },
  { context: "docs", kind: "table", label: "Table", group: "Structure" },
  {
    context: "docs",
    kind: "rule",
    label: "Horizontal rule",
    group: "Structure",
  },
  { context: "docs", kind: "figure", label: "Figure", group: "Media" },
  { context: "docs", kind: "link-card", label: "Link card", group: "Media" },
  {
    context: "docs",
    kind: "definition",
    label: "Definition",
    group: "Reference",
  },
  { context: "docs", kind: "decision", label: "Decision (ADR)", group: "Spec" },
  { context: "docs", kind: "persona", label: "Persona", group: "Spec" },
  { context: "docs", kind: "user-story", label: "User story", group: "Spec" },
  { context: "docs", kind: "risk", label: "Risk", group: "Spec" },
  { context: "docs", kind: "metric", label: "Metric / KPI", group: "Spec" },

  // ────────── app (web/shared) ──────────
  {
    context: "app",
    kind: "page-header",
    label: "Page header",
    group: "Layout",
  },
  { context: "app", kind: "sidebar", label: "Sidebar", group: "Layout" },
  { context: "app", kind: "footer", label: "Footer", group: "Layout" },
  { context: "app", kind: "tabs", label: "Tabs", group: "Layout" },
  { context: "app", kind: "modal", label: "Modal", group: "Layout" },
  { context: "app", kind: "divider", label: "Divider", group: "Layout" },
  { context: "app", kind: "nav", label: "Nav", group: "Navigation" },
  { context: "app", kind: "hero", label: "Hero", group: "Content" },
  {
    context: "app",
    kind: "cta-section",
    label: "CTA section",
    group: "Content",
  },
  { context: "app", kind: "card-grid", label: "Card grid", group: "Content" },
  { context: "app", kind: "text", label: "Text", group: "Content" },
  { context: "app", kind: "list", label: "List", group: "Content" },
  { context: "app", kind: "image", label: "Image", group: "Content" },
  { context: "app", kind: "stat", label: "Stat", group: "Content" },
  { context: "app", kind: "avatar", label: "Avatar", group: "Content" },
  { context: "app", kind: "badge", label: "Badge", group: "Content" },
  { context: "app", kind: "form", label: "Form", group: "Input" },
  { context: "app", kind: "button", label: "Button", group: "Input" },
  { context: "app", kind: "input", label: "Input", group: "Input" },
  { context: "app", kind: "banner", label: "Banner", group: "Feedback" },
  {
    context: "app",
    kind: "empty-state",
    label: "Empty state",
    group: "Feedback",
  },

  // mobile-only
  {
    context: "app",
    kind: "status-bar",
    label: "Status bar",
    group: "Mobile",
    platform: "mobile",
  },
  {
    context: "app",
    kind: "bottom-nav",
    label: "Bottom nav",
    group: "Mobile",
    platform: "mobile",
  },
  {
    context: "app",
    kind: "list-row",
    label: "List row",
    group: "Mobile",
    platform: "mobile",
  },
  {
    context: "app",
    kind: "fab",
    label: "FAB",
    group: "Mobile",
    platform: "mobile",
  },
  {
    context: "app",
    kind: "sheet",
    label: "Sheet",
    group: "Mobile",
    platform: "mobile",
  },

  // ────────── agent ──────────
  { context: "agent", kind: "agent-step", label: "Step", group: "Agent" },
];

export function blockKindsForContext(
  context: BlockContext,
  platform: "mobile" | "web" = "web",
): BlockKindSpec[] {
  return BLOCK_KIND_REGISTRY.filter(
    (s) =>
      s.context === context &&
      (s.platform === undefined || s.platform === platform),
  );
}

export function defaultDataFor(blockKind: BlockKind): Record<string, unknown> {
  switch (blockKind) {
    // docs
    case "heading":
      return { level: 1, text: "" };
    case "paragraph":
      return { markdown: "" };
    case "blockquote":
      return { text: "", cite: "" };
    case "callout":
      return { variant: "info", text: "" };
    case "code-block":
      return { language: "ts", code: "" };
    case "bullet-list":
      return { ordered: false, items: [] };
    case "numbered-list":
      return { ordered: true, items: [] };
    case "checklist":
      return { items: [] as { text: string; checked: boolean }[] };
    case "table":
      return { columns: ["", ""], rows: [["", ""]] };
    case "rule":
      return {};
    case "figure":
      return { src: "", alt: "", caption: "" };
    case "link-card":
      return { url: "", title: "", description: "" };
    case "definition":
      return { term: "", definition: "" };
    case "decision":
      return { question: "", options: [], decision: "", rationale: "" };
    case "persona":
      return { name: "", role: "", needs: [], pains: [] };
    case "user-story":
      return { as: "", want: "", soThat: "", acceptance: [] };
    case "risk":
      return { risk: "", impact: "", mitigation: "", owner: "" };
    case "metric":
      return { name: "", target: "", current: "", status: "ok" };
    case "page-header":
      return { title: "", subtitle: "" };
    case "hero":
      return { title: "", subtitle: "", cta: "" };
    case "cta-section":
      return { title: "", body: "", cta: "" };
    case "card-grid":
      return { columns: 3, cards: [] };
    case "form":
      return { fields: [] };
    case "button":
      return { label: "Action", variant: "primary" };
    case "input":
      return { label: "", placeholder: "", type: "text" };
    case "sidebar":
      return { items: [] };
    case "footer":
      return { items: [] };
    case "tabs":
      return { tabs: [] };
    case "modal":
      return { title: "", body: "" };
    case "banner":
      return { variant: "info", text: "" };
    case "stat":
      return { label: "", value: "" };
    case "avatar":
      return { name: "", src: "" };
    case "badge":
      return { label: "", variant: "default" };
    case "empty-state":
      return { title: "", body: "" };
    case "status-bar":
      return { variant: "light" };
    case "bottom-nav":
      return { items: [] };
    case "list-row":
      return { title: "", subtitle: "", trailing: "" };
    case "fab":
      return { label: "+" };
    case "sheet":
      return { title: "", body: "" };
    case "nav":
      return { items: [] };
    case "text":
      return { markdown: "" };
    case "list":
      return { ordered: false, items: [] };
    case "image":
      return { src: "", alt: "", caption: "" };
    case "divider":
      return {};
    case "agent-step":
      return { role: "input", spec: {} };
  }
}

export type BuildSeedDeps = {
  newId: () => string;
  origin: OriginId;
};

export function buildSeedSnapshot(
  planId: string,
  kind: ProjectKind,
  deps: BuildSeedDeps,
): AppState {
  const sections: Record<string, SectionEntity> = {};
  const docsRootIds: string[] = [];
  const children: Record<string, string[]> = {};

  function visit(spec: SectionSeedSpec, parentId: string | null): string {
    const id = deps.newId();
    sections[id] = {
      id,
      planId,
      parentId,
      kind: spec.kind,
      title: spec.title,
    };
    if (spec.children) {
      const childIds: string[] = [];
      for (const c of spec.children) {
        childIds.push(visit(c, id));
      }
      children[id] = childIds;
    }
    return id;
  }

  for (const spec of defaultDocsTreeFor(kind)) {
    docsRootIds.push(visit(spec, null));
  }

  const baseScreens: AppState["screens"] = {};
  const baseChildren = { ...children };
  let currentScreenId: string | null = null;

  if (kind === "web" || kind === "mobile") {
    const screenId = deps.newId();
    baseScreens[screenId] = {
      id: screenId,
      planId,
      title: kind === "web" ? "Home" : "Main",
    };
    baseChildren[screenId] = [];
    currentScreenId = screenId;
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    projects: {},
    plans: {
      [planId]: {
        id: planId,
        projectId: planId,
        kind,
        meta: {},
        agentTab: "scenario",
      },
    },
    blocks: {},
    screens: baseScreens,
    agentNodes: {},
    agentEdges: {},
    screenEdges: {},
    sections,
    docsRootIds,
    currentScreenId,
    children: baseChildren,
    entityMeta: {},
    selection: { kind: "none" },
    editing: { kind: "none" },
    agentTab: "scenario",
    viewMode: "detail",
    origin: deps.origin,
    lamport: 0,
    pending: {},
    appliedEntries: [],
    historyPast: [],
    historyFuture: [],
    lastError: null,
  };
}
