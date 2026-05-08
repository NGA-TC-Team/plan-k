import {
  BLOCK_KIND_REGISTRY as REGISTRY_BLOCK_KIND_REGISTRY,
  type BlockKindSpec as RegistryBlockKindSpec,
  blockKindsForContext as registryBlockKindsForContext,
  defaultDataFor as registryDefaultDataFor,
} from "./blocks/registry";
import { populateSeed } from "./seeds";
import type {
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
  /** One-line description for tooltips and template pickers. */
  description?: string;
  children?: SectionSeedSpec[];
};

/**
 * One starter block to drop into a freshly-templated section. The dropdown
 * adder reads `SECTION_INFO[kind].starter` (an array of these) and dispatches
 * INSERT_BLOCK once per entry. `data` is shallow-merged over the kind's
 * registry defaults — only override what's interesting to seed.
 */
export type StarterBlockSpec = {
  kind: BlockKind;
  data?: Record<string, unknown>;
};

/**
 * Single source of truth for human-facing section metadata. The dropdown in
 * the docs rail and any future template gallery both read from here.
 *
 * Keep descriptions short (≤90 chars) and oriented around *what to write*,
 * not *what the section is*.
 */
export const SECTION_INFO: Record<
  SectionKind,
  {
    title: string;
    titleKo: string;
    description: string;
    starter?: StarterBlockSpec[];
  }
> = {
  // ── shared ──
  overview: {
    title: "Overview",
    titleKo: "개요",
    description: "한 문단 노스스타 — 제품 정체성, 타깃, 차별점.",
  },
  personas: {
    title: "Personas",
    titleKo: "페르소나",
    description: "타깃 사용자 — 목표, 해결할 일, 불편, 인용구.",
  },
  glossary: {
    title: "Glossary",
    titleKo: "용어 사전",
    description: "스펙 전반에서 사용하는 도메인 용어·약어 정의.",
  },
  policy: {
    title: "Policy",
    titleKo: "정책",
    description: "고객 응대 엣지 케이스에서 제품이 따라야 할 정책.",
  },
  "policy-general": {
    title: "General handling",
    titleKo: "일반 처리",
    description: "기본 톤, 에스컬레이션 규칙, 응답 SLA.",
  },
  "policy-special": {
    title: "Special situations",
    titleKo: "특수 상황",
    description: "환불·컴플레인·사기·악용·VIP 처리.",
  },
  "policy-writing": {
    title: "Writing & tone",
    titleKo: "라이팅·톤",
    description: "보이스, 격식, 권장/금지 표현.",
  },
  "policy-error": {
    title: "Error messages",
    titleKo: "에러 메시지",
    description: "분류(인증·네트워크·검증)별 에러 카피 템플릿.",
  },
  business: {
    title: "Business plan",
    titleKo: "사업 계획",
    description: "요금제, GTM 전략, 타깃 고객, 수익 모델.",
  },
  ops: {
    title: "Ops & lifecycle",
    titleKo: "운영·라이프사이클",
    description: "온보딩·지원·리텐션·오프보딩 등 Day-2 운영.",
  },
  tech: {
    title: "Tech architecture",
    titleKo: "기술 아키텍처",
    description: "시스템 다이어그램·런타임·DB·배포 구조.",
  },
  api: {
    title: "API design",
    titleKo: "API 설계",
    description: "엔드포인트·인증·에러 스키마·버저닝·웹훅.",
    starter: [
      { kind: "heading", data: { level: 2, text: "Endpoints" } },
      { kind: "api-endpoint", data: { method: "GET", path: "/v1/" } },
    ],
  },
  data: {
    title: "Data model",
    titleKo: "데이터 모델",
    description: "엔티티·관계·불변식·보존 정책.",
  },
  risks: {
    title: "Risks & assumptions",
    titleKo: "리스크·가정",
    description: "무엇이 잘못될 수 있고 어떻게 완화하는지.",
  },
  metrics: {
    title: "Metrics & KPIs",
    titleKo: "지표·KPI",
    description: "노스스타와 보조 지표, 목표 수준.",
  },
  roadmap: {
    title: "Roadmap & milestones",
    titleKo: "로드맵·마일스톤",
    description: "Now / Next / Later 일정과 완료 기준.",
    starter: [
      { kind: "heading", data: { level: 2, text: "Now" } },
      { kind: "milestone", data: { status: "in-progress" } },
      { kind: "heading", data: { level: 2, text: "Next" } },
      { kind: "milestone", data: { status: "planned" } },
      { kind: "heading", data: { level: 2, text: "Later" } },
      { kind: "milestone", data: { status: "planned" } },
    ],
  },
  changelog: {
    title: "Changelog",
    titleKo: "변경 이력",
    description: "릴리스별 변경 사항 — 추가·변경·수정·제거.",
    starter: [{ kind: "release-note" }],
  },
  security: {
    title: "Security & privacy",
    titleKo: "보안·개인정보",
    description: "위협 모델·데이터 등급·인증·PII 처리·시크릿.",
    starter: [
      { kind: "heading", data: { level: 2, text: "Threat model" } },
      { kind: "paragraph", data: { markdown: "" } },
      { kind: "heading", data: { level: 2, text: "Data classes" } },
      {
        kind: "table",
        data: {
          columns: ["Class", "Examples", "Encryption", "Retention"],
          rows: [["", "", "", ""]],
        },
      },
    ],
  },
  compliance: {
    title: "Compliance & legal",
    titleKo: "컴플라이언스·법무",
    description: "적용 규제(GDPR·KISA·PCI), 감사, 약관, DPA.",
    starter: [
      {
        kind: "checklist",
        data: {
          items: [
            { text: "GDPR (EU)", checked: false },
            { text: "PCI DSS", checked: false },
            { text: "KISA / 개인정보보호법", checked: false },
            { text: "SOC 2", checked: false },
          ],
        },
      },
    ],
  },
  testing: {
    title: "Testing strategy",
    titleKo: "테스트 전략",
    description: "테스트 피라미드(unit·integration·e2e)와 커버리지 목표.",
    starter: [
      {
        kind: "metric",
        data: { name: "Coverage", target: "80", unit: "%", status: "ok" },
      },
      { kind: "heading", data: { level: 2, text: "Test pyramid" } },
      {
        kind: "checklist",
        data: {
          items: [
            { text: "Unit", checked: false },
            { text: "Integration", checked: false },
            { text: "End-to-end", checked: false },
          ],
        },
      },
    ],
  },
  // ── web ──
  journeys: {
    title: "User journeys",
    titleKo: "사용자 여정",
    description: "주요 태스크의 단계별 흐름과 분기 지점.",
    starter: [
      { kind: "heading", data: { level: 2, text: "Happy path" } },
      { kind: "journey-step", data: { step: 1 } },
      { kind: "journey-step", data: { step: 2 } },
      { kind: "journey-step", data: { step: 3 } },
    ],
  },
  "design-system": {
    title: "Design system",
    titleKo: "디자인 시스템",
    description: "토큰·컴포넌트·브랜드 보이스·모션·접근성 훅.",
    starter: [
      { kind: "heading", data: { level: 2, text: "Color" } },
      {
        kind: "color-swatch",
        data: { name: "Primary", hex: "#0066ff", role: "Primary CTA, links" },
      },
      {
        kind: "color-swatch",
        data: { name: "Neutral", hex: "#71717a", role: "Body text, borders" },
      },
      {
        kind: "color-swatch",
        data: { name: "Success", hex: "#10b981", role: "Confirmation states" },
      },
      {
        kind: "color-swatch",
        data: { name: "Error", hex: "#ef4444", role: "Destructive actions" },
      },
      { kind: "heading", data: { level: 2, text: "Typography" } },
      {
        kind: "table",
        data: {
          columns: ["Role", "Font", "Size", "Weight", "Line height"],
          rows: [
            ["Display", "", "", "", ""],
            ["Heading", "", "", "", ""],
            ["Body", "", "", "", ""],
          ],
        },
      },
    ],
  },
  accessibility: {
    title: "Accessibility",
    titleKo: "접근성",
    description: "WCAG 목표·키보드 내비·스크린리더·명도 대비.",
    starter: [
      { kind: "heading", data: { level: 2, text: "WCAG 2.2 AA" } },
      {
        kind: "checklist",
        data: {
          items: [
            {
              text: "Perceivable — contrast, alt text, captions",
              checked: false,
            },
            {
              text: "Operable — keyboard, focus order, no traps",
              checked: false,
            },
            {
              text: "Understandable — labels, errors, predictable nav",
              checked: false,
            },
            { text: "Robust — valid markup, ARIA when needed", checked: false },
          ],
        },
      },
    ],
  },
  i18n: {
    title: "Internationalization",
    titleKo: "다국어",
    description: "로캘·통화·날짜·RTL·카피 길이 예산.",
    starter: [
      { kind: "heading", data: { level: 2, text: "Locales" } },
      {
        kind: "table",
        data: {
          columns: ["Locale", "Status", "Owner", "Notes"],
          rows: [
            ["ko-KR", "primary", "", ""],
            ["en-US", "planned", "", ""],
          ],
        },
      },
    ],
  },
  seo: {
    title: "SEO & analytics",
    titleKo: "SEO·애널리틱스",
    description: "페이지 메타·사이트맵·트래킹 이벤트·전환 퍼널.",
    starter: [
      { kind: "heading", data: { level: 2, text: "Meta tags" } },
      {
        kind: "table",
        data: {
          columns: ["Page", "Title", "Description", "OG image"],
          rows: [["/", "", "", ""]],
        },
      },
      { kind: "heading", data: { level: 2, text: "Tracking events" } },
      {
        kind: "table",
        data: {
          columns: ["Event name", "When fired", "Properties"],
          rows: [["", "", ""]],
        },
      },
    ],
  },
  // ── agent ──
  "agent-persona": {
    title: "Agent persona",
    titleKo: "에이전트 페르소나",
    description: "에이전트의 보이스·범위·거절 방식·시그니처 어투.",
  },
  "agent-tools": {
    title: "Tools spec",
    titleKo: "툴 스펙",
    description: "각 툴의 이름·인자·부수 효과·호출 조건.",
  },
  "agent-memory": {
    title: "Memory model",
    titleKo: "메모리 모델",
    description: "단기·장기 메모리, 요약, 만료 정책.",
  },
  "agent-trigger": {
    title: "Trigger conditions",
    titleKo: "트리거 조건",
    description: "에이전트가 활성화되는 시점 — 크론·이벤트·의도 인식.",
  },
  "agent-examples": {
    title: "Sample interactions",
    titleKo: "샘플 인터랙션",
    description: "골든 대화 — 정상·엣지 경로 모두.",
  },
  "agent-failure": {
    title: "Failure modes",
    titleKo: "실패 모드",
    description: "잘못될 수 있는 시나리오와 에이전트의 복구 스크립트.",
  },
  "agent-prompt": {
    title: "Prompt design",
    titleKo: "프롬프트 설계",
    description: "시스템 프롬프트, 역할, 제약, 출력 스키마.",
    starter: [
      { kind: "heading", data: { level: 2, text: "System prompt" } },
      {
        kind: "code-block",
        data: {
          language: "md",
          filename: "system.md",
          code: "You are…\n\n## Constraints\n- ",
        },
      },
    ],
  },
  "agent-eval": {
    title: "Evaluation harness",
    titleKo: "평가 하네스",
    description: "평가 데이터셋·스코어링 루브릭·회귀 기준선.",
    starter: [
      { kind: "heading", data: { level: 2, text: "Eval cases" } },
      {
        kind: "table",
        data: {
          columns: ["ID", "Input", "Expected", "Score", "Notes"],
          rows: [["", "", "", "", ""]],
        },
      },
    ],
  },
  "agent-knowledge": {
    title: "Knowledge base / RAG",
    titleKo: "지식 베이스 / RAG",
    description: "소스·청킹·검색 전략·갱신 주기.",
    starter: [
      { kind: "heading", data: { level: 2, text: "Sources" } },
      {
        kind: "table",
        data: {
          columns: ["Source", "Type", "Refresh", "Owner"],
          rows: [["", "", "", ""]],
        },
      },
    ],
  },
  // ── mobile ──
  platform: {
    title: "Platform spec (iOS / Android)",
    titleKo: "플랫폼 스펙 (iOS·Android)",
    description: "플랫폼별 차이 — 내비게이션·제스처·OS API.",
  },
  "native-modules": {
    title: "Native modules & permissions",
    titleKo: "네이티브 모듈·권한",
    description: "네이티브 브리지, Info.plist / Manifest 항목.",
  },
  permissions: {
    title: "Permissions",
    titleKo: "권한",
    description: "런타임 권한 매트릭스와 사용자에게 보일 사유 카피.",
  },
  "app-store": {
    title: "App store submission",
    titleKo: "앱스토어 제출",
    description: "메타데이터·스크린샷·리뷰 노트·릴리스 트랙.",
    starter: [
      { kind: "heading", data: { level: 2, text: "Metadata" } },
      {
        kind: "table",
        data: {
          columns: ["Field", "iOS", "Android"],
          rows: [
            ["Title", "", ""],
            ["Subtitle", "", ""],
            ["Keywords", "", ""],
            ["Category", "", ""],
          ],
        },
      },
    ],
  },
  push: {
    title: "Push notifications",
    titleKo: "푸시 알림",
    description: "토픽 분류·쓰로틀링·딥링크 페이로드·옵트인 UX.",
    starter: [
      { kind: "heading", data: { level: 2, text: "Topics" } },
      {
        kind: "table",
        data: {
          columns: ["Topic", "Trigger", "Throttle", "Deep link"],
          rows: [["", "", "", ""]],
        },
      },
      { kind: "heading", data: { level: 2, text: "Payload example" } },
      {
        kind: "code-block",
        data: {
          language: "json",
          code: '{\n  "topic": "order.update",\n  "title": "Order ready",\n  "body": "",\n  "data": {}\n}',
        },
      },
    ],
  },
  "deep-link": {
    title: "Deep linking",
    titleKo: "딥링크",
    description: "URL 스킴·Universal Links·App Links·폴백 흐름.",
    starter: [
      { kind: "heading", data: { level: 2, text: "Routes" } },
      {
        kind: "table",
        data: {
          columns: ["URL pattern", "Screen", "Auth required", "Fallback"],
          rows: [["", "", "", ""]],
        },
      },
    ],
  },
  offline: {
    title: "Offline strategy",
    titleKo: "오프라인 전략",
    description: "캐시 계층·동기화 충돌 규칙·오프라인 UI 상태.",
    starter: [
      { kind: "heading", data: { level: 2, text: "Cache layers" } },
      { kind: "bullet-list", data: { ordered: false, items: [""] } },
    ],
  },
  custom: {
    title: "Custom",
    titleKo: "커스텀",
    description: "자유 형식 섹션.",
  },
  backlog: {
    title: "Backlog",
    titleKo: "백로그",
    description: "Backlog 칸반 카드. Docs 레일에는 표시되지 않음.",
  },
};

function specFor(
  kind: SectionKind,
  override?: Partial<SectionSeedSpec>,
): SectionSeedSpec {
  const info = SECTION_INFO[kind];
  return {
    kind,
    title: override?.title ?? info.title,
    description: override?.description ?? info.description,
    children: override?.children,
  };
}

export function defaultDocsTreeFor(kind: ProjectKind): SectionSeedSpec[] {
  const policySection: SectionSeedSpec = specFor("policy", {
    children: [
      specFor("policy-general"),
      specFor("policy-special"),
      specFor("policy-writing"),
      specFor("policy-error"),
    ],
  });

  const sharedFront: SectionSeedSpec[] = [specFor("overview")];
  const sharedBack: SectionSeedSpec[] = [specFor("business"), specFor("ops")];

  // Common shared blocks at the tail of every plan kind.
  const sharedTail: SectionSeedSpec[] = [
    specFor("roadmap"),
    specFor("security"),
    specFor("compliance"),
    specFor("changelog"),
    specFor("testing"),
    specFor("risks"),
    specFor("metrics"),
  ];

  switch (kind) {
    case "web":
      return [
        ...sharedFront,
        specFor("personas"),
        specFor("journeys"),
        specFor("glossary"),
        policySection,
        ...sharedBack,
        specFor("tech"),
        specFor("api"),
        specFor("data"),
        specFor("design-system"),
        specFor("accessibility"),
        specFor("i18n"),
        specFor("seo"),
        ...sharedTail,
      ];
    case "mobile":
      return [
        ...sharedFront,
        specFor("personas"),
        specFor("journeys"),
        specFor("glossary"),
        policySection,
        ...sharedBack,
        specFor("platform"),
        specFor("native-modules"),
        specFor("permissions"),
        specFor("data"),
        specFor("design-system"),
        specFor("accessibility"),
        specFor("i18n"),
        specFor("push"),
        specFor("deep-link"),
        specFor("offline"),
        specFor("app-store"),
        ...sharedTail,
      ];
    case "agent":
      return [
        ...sharedFront,
        specFor("agent-persona"),
        specFor("agent-prompt"),
        specFor("glossary"),
        policySection,
        ...sharedBack,
        specFor("agent-tools"),
        specFor("agent-memory"),
        specFor("agent-knowledge"),
        specFor("agent-trigger"),
        specFor("agent-examples"),
        specFor("agent-failure"),
        specFor("agent-eval"),
        ...sharedTail,
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
  // When false, the snapshot is created with empty docs/screens/agent graph.
  // Sections are still scaffolded so the builder has a navigable tree.
  // Default true keeps demo plans + new "from template" projects unchanged.
  seed?: boolean;
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

  const state: AppState = {
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

  if (deps.seed !== false) {
    populateSeed(state, kind, { newId: deps.newId, planId });
  }

  return state;
}
