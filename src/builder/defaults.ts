import {
  BLOCK_KIND_REGISTRY as REGISTRY_BLOCK_KIND_REGISTRY,
  type BlockKindSpec as RegistryBlockKindSpec,
  blockKindsForContext as registryBlockKindsForContext,
  defaultDataFor as registryDefaultDataFor,
} from "./blocks/registry";
import type { ProjectKind, SectionEntity, SectionKind } from "./types/entity";
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

export type BlockKindSpec = RegistryBlockKindSpec;

export const BLOCK_KIND_REGISTRY: BlockKindSpec[] =
  REGISTRY_BLOCK_KIND_REGISTRY;

export const blockKindsForContext = registryBlockKindsForContext;

export const defaultDataFor = registryDefaultDataFor;

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
