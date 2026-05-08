import type { AppState } from "@/builder/types/state";
import {
  addAgentEdge,
  addAgentNode,
  appendBlocks,
  b,
  fillSection,
  findSectionByKind,
  type SeedDeps,
} from "./helpers";

// ─────────────────────────────────────────────────────────────────────────────
// demo-agent — "Saetbyeol" (샛별)
// 새벽배송 사업자 CS 인박스 트리아지 에이전트. 채널톡 webhook으로 들어온
// 고객 문의를 분류하고, 주문 조회 / KB 검색 / 환불 정책 검증을 거친 뒤
// 상담사용 응답 초안을 작성해 Slack에 게시한다. 사람 검토는 항상 필요.
// ─────────────────────────────────────────────────────────────────────────────

export function populateAgentSeed(state: AppState, deps: SeedDeps): void {
  fillSection(state, deps, "overview", [
    b("heading", {
      level: 1,
      text: "Saetbyeol (샛별) — Pre-dawn delivery CS triage agent",
    }),
    b("paragraph", {
      markdown:
        "Saetbyeol reads incoming customer messages from Channel.io, classifies the intent, fetches the matching order, looks up policy, and drafts a Korean reply for the human agent to send. It does not send messages on its own — drafts always land in a Slack queue first.",
    }),
    b("paragraph", {
      markdown:
        "**The wedge.** Pre-dawn-delivery operators (Kurly-style) get 70%+ of CS volume in a 90-minute window between 06:00 and 07:30 KST. Hiring agents to cover that spike is uneconomical. Saetbyeol pre-drafts so two agents can do the work of five, with humans owning the send button.",
    }),
    b("callout", {
      variant: "info",
      title: "Stage",
      text: "Pilot with one mid-size grocer (28k orders/day). Drafts approved at 81% rate after 4 weeks.",
    }),
    b("stat", {
      label: "Tickets/day handled",
      value: "1,420",
      change: "+12%",
      changeKind: "up",
    }),
    b("stat", {
      label: "Draft approval rate",
      value: "81%",
      change: "+6pt",
      changeKind: "up",
    }),
    b("stat", {
      label: "Median agent response time",
      value: "1m 48s",
      change: "-72%",
      changeKind: "down",
    }),
    b("checklist", {
      items: [
        { text: "Channel.io webhook + signature verification", checked: true },
        { text: "Intent classifier with 5-class taxonomy", checked: true },
        { text: "Order lookup tool (read-only)", checked: true },
        { text: "KB search across CS handbook", checked: true },
        { text: "Refund policy check tool", checked: true },
        {
          text: "Slack draft posting + reaction-based feedback loop",
          checked: true,
        },
        { text: "Multi-tenant isolation (M5)", checked: false },
        {
          text: "Outbound send (with explicit per-merchant opt-in) (M6)",
          checked: false,
        },
      ],
    }),
    b("rule"),
    b("paragraph", {
      markdown:
        "**Non-goals.** No outbound messaging. No order modifications. No proactive marketing replies. No voice-channel coverage in v1.",
    }),
  ]);

  fillSection(state, deps, "agent-persona", [
    b("heading", { level: 2, text: "Agent persona" }),
    b("persona", {
      name: "Saetbyeol",
      role: "CS triage assistant — drafts, never sends",
      demographics:
        "Always-on; single-tenant pilot scope; max 8 minutes of context per ticket",
      goals: [
        "Classify intent within 800ms p95",
        "Produce drafts that humans approve at >75%",
        "Never propose a refund that violates the merchant's posted policy",
      ],
      needs: [
        "Read access to the order ledger",
        "Read access to the merchant's CS knowledge base",
        "Slack channel + reaction conventions for human feedback",
      ],
      pains: [
        "Customers send unrelated multi-topic messages in a single thread",
        "Order IDs are sometimes pasted with KakaoTalk-mangled whitespace",
        "Merchant policy text contradicts itself across pages",
      ],
      quote: "사람이 누르는 'send'까지가 내 일이에요.",
    }),
    b("paragraph", {
      markdown:
        "**Boundaries.** Saetbyeol surfaces a confidence score with every draft. Below 0.6, it routes to humans without a draft and flags the case as 'human-only'. Hardcoded escalation triggers (allergic reaction, food-borne illness, lost package over ₩200,000) bypass drafting entirely.",
    }),
    b("callout", {
      variant: "warn",
      title: "Hard limits",
      text: "Saetbyeol will not draft replies that promise compensation, claim cause of damage, or apologize on behalf of riders. Those phrases come only from a human.",
    }),
  ]);

  fillSection(state, deps, "glossary", [
    b("heading", { level: 2, text: "Glossary" }),
    b("definition", {
      term: "Triage",
      definition:
        "Initial classification + routing of a ticket. Saetbyeol's primary job.",
    }),
    b("definition", {
      term: "Intent",
      definition:
        "The customer's underlying ask, normalized to one of: 배송지연, 오배송, 환불, 상품문의, 기타.",
    }),
    b("definition", {
      term: "Draft",
      definition:
        "A proposed reply Saetbyeol writes for human approval. Includes confidence + cited sources.",
    }),
    b("definition", {
      term: "KB",
      definition:
        "Knowledge base — markdown documents merged from the merchant's CS handbook + product catalog descriptions.",
    }),
    b("definition", {
      term: "Channel.io",
      definition:
        "Customer messaging SaaS used by the pilot merchant. Source of inbound webhooks.",
    }),
    b("definition", {
      term: "Confidence",
      definition:
        "Float in [0,1] estimated by the LLM step. Drafts below 0.6 are not posted.",
    }),
    b("definition", {
      term: "Tool call",
      definition:
        "A structured invocation of an external function. Saetbyeol uses 3: orders.get, kb.search, refund.policy.check.",
    }),
    b("definition", {
      term: "Hard escalation",
      definition:
        "Predefined keywords or signals that bypass drafting and page a senior CS lead.",
    }),
  ]);

  fillSection(state, deps, "policy-general", [
    b("heading", { level: 3, text: "General handling" }),
    b("checklist", {
      items: [
        {
          text: "Every ticket gets exactly one draft or one explicit 'no draft' flag",
          checked: true,
        },
        {
          text: "Tool calls are logged with input + output for 30 days",
          checked: true,
        },
        {
          text: "PII (phone, address) is redacted from logs at ingest",
          checked: true,
        },
        { text: "Drafts cite the KB document sections used", checked: true },
      ],
    }),
    b("paragraph", {
      markdown:
        "Drafts are written in 정중·간결 Korean. English customers get an English draft via the same pipeline, picking the merchant's English KB if available.",
    }),
  ]);

  fillSection(state, deps, "policy-special", [
    b("heading", { level: 3, text: "Special situations" }),
    b("callout", {
      variant: "error",
      title: "Allergic reaction / food-borne illness",
      text: "Bypass draft. Page senior CS lead via Slack #cs-emergency. Human handles the entire conversation.",
    }),
    b("callout", {
      variant: "warn",
      title: "High-value lost package (≥ ₩200,000)",
      text: "Bypass draft. Auto-pull order, attach to ticket, route to human with priority 'high'.",
    }),
    b("callout", {
      variant: "info",
      title: "Multi-topic ticket",
      text: "If 2+ intents detected with confidence > 0.5 each, draft addresses the highest-priority one and notes the others as TODO for the human.",
    }),
  ]);

  fillSection(state, deps, "policy-writing", [
    b("heading", { level: 3, text: "Writing & tone" }),
    b("paragraph", {
      markdown:
        "All drafts open with acknowledgment + immediate next action. No apologetic flourishes; merchant brand voice rejects '죄송합니다' stacking.",
    }),
    b("table", {
      columns: ["Situation", "Yes", "No"],
      rows: [
        ["Acknowledge", "주문 확인했어요.", "정말 정말 죄송합니다."],
        [
          "Refund offer",
          "환불 처리해드릴게요. 24시간 내에 카드사로 전달돼요.",
          "최대한 빨리 처리해보도록 하겠습니다.",
        ],
        [
          "Delay reason",
          "라이더가 30분 늦어요.",
          "물류 사정으로 지연되고 있는 점 양해 부탁드립니다.",
        ],
        ["Length", "3 문장 이내", "5 문장 초과"],
      ],
    }),
  ]);

  fillSection(state, deps, "policy-error", [
    b("heading", { level: 3, text: "Failure messages (internal)" }),
    b("table", {
      columns: ["Code", "Cause", "Action"],
      rows: [
        [
          "TRIAGE-001",
          "Intent classifier confidence < 0.6 across all classes",
          "No draft; route to human",
        ],
        [
          "TRIAGE-002",
          "Tool call timeout (>3s)",
          "Retry once with smaller payload; if still fails, no draft",
        ],
        [
          "TRIAGE-003",
          "PII detected in customer message",
          "Redact in logs only; pipeline continues",
        ],
        [
          "TRIAGE-004",
          "Multi-topic ticket with no clear primary",
          "Route to human with all detected intents",
        ],
        [
          "TRIAGE-005",
          "Hard-escalation keyword detected",
          "Bypass draft; page senior lead",
        ],
      ],
    }),
  ]);

  fillSection(state, deps, "business", [
    b("heading", { level: 2, text: "Business plan" }),
    b("paragraph", {
      markdown:
        "Per-merchant subscription priced as a function of monthly tickets handled, billed on a 'tickets where draft was used' meter.",
    }),
    b("table", {
      columns: ["Tier", "Tickets/mo", "Price"],
      rows: [
        ["Pilot", "≤ 5,000", "₩900,000"],
        ["Standard", "≤ 30,000", "₩3,500,000"],
        ["Scale", "≤ 120,000", "₩9,800,000"],
        ["Enterprise", "Unlimited", "Quote"],
      ],
    }),
    b("metric", {
      name: "ARPU (mo)",
      target: "₩4,500,000",
      current: "₩2,100,000",
      status: "warn",
      unit: "",
      trend: "up",
    }),
    b("metric", {
      name: "Pilot → standard conversion",
      target: "60%",
      current: "33%",
      status: "bad",
      unit: "%",
      trend: "up",
    }),
    b("metric", {
      name: "Gross margin",
      target: "65%",
      current: "58%",
      status: "warn",
      unit: "%",
      trend: "up",
    }),
  ]);

  fillSection(state, deps, "ops", [
    b("heading", { level: 2, text: "Ops & lifecycle" }),
    b("numbered-list", {
      ordered: true,
      items: [
        "Pilot kickoff (1 week): KB ingest, intent taxonomy validation, signature setup.",
        "Shadow mode (2 weeks): Saetbyeol drafts but humans don't see them; we score offline.",
        "Soft launch (2 weeks): drafts visible in Slack, humans rate every draft.",
        "Standard ops: weekly review of low-confidence cases + draft approval rate.",
        "Quarterly KB re-ingest with diff alerts.",
      ],
    }),
    b("checklist", {
      items: [
        { text: "On-call rotation for tool failures", checked: true },
        { text: "Weekly merchant review meeting", checked: true },
        { text: "Monthly cost-per-ticket report", checked: true },
        {
          text: "Quarterly model re-eval on a frozen 200-ticket gold set",
          checked: true,
        },
      ],
    }),
  ]);

  fillSection(state, deps, "agent-tools", [
    b("heading", { level: 2, text: "Tools spec" }),
    b("paragraph", {
      markdown:
        "Saetbyeol has exactly 3 tools. Adding a tool requires a written ADR + merchant security review.",
    }),
    b("table", {
      columns: ["Tool", "Purpose", "Scopes", "Latency budget"],
      rows: [
        [
          "orders.get",
          "Look up an order by ID or by (customer phone + recent date)",
          "orders:read",
          "< 400ms p95",
        ],
        [
          "kb.search",
          "BM25 + dense-retrieval over merchant CS handbook",
          "kb:read",
          "< 600ms p95",
        ],
        [
          "refund.policy.check",
          "Check if a refund of given amount + reason is permitted",
          "refund:check (no write)",
          "< 200ms p95",
        ],
      ],
    }),
    b("code-block", {
      language: "json",
      filename: "tools.json",
      code: '[\n  {\n    "name": "orders.get",\n    "description": "Fetch a single order by ID or by (phone, date) tuple.",\n    "input_schema": {\n      "type": "object",\n      "oneOf": [\n        { "required": ["order_id"] },\n        { "required": ["phone", "placed_on"] }\n      ],\n      "properties": {\n        "order_id": { "type": "string" },\n        "phone": { "type": "string" },\n        "placed_on": { "type": "string", "format": "date" }\n      }\n    }\n  },\n  {\n    "name": "kb.search",\n    "description": "Hybrid search across merchant CS handbook.",\n    "input_schema": {\n      "type": "object",\n      "required": ["query"],\n      "properties": {\n        "query": { "type": "string" },\n        "k": { "type": "integer", "default": 4 }\n      }\n    }\n  },\n  {\n    "name": "refund.policy.check",\n    "description": "Returns whether a refund is allowed under merchant policy. No state changes.",\n    "input_schema": {\n      "type": "object",\n      "required": ["order_id", "reason", "amount"],\n      "properties": {\n        "order_id": { "type": "string" },\n        "reason": { "type": "string", "enum": ["missing", "damaged", "wrong_item", "customer_request"] },\n        "amount": { "type": "integer", "minimum": 0 }\n      }\n    }\n  }\n]',
    }),
    b("decision", {
      question: "Should refund.policy.check ever execute the refund?",
      status: "accepted",
      context:
        "Engineering proposed a 'check_and_apply' variant that would let Saetbyeol issue refunds itself when the policy is unambiguous.",
      options: [
        {
          label: "Read-only check (current)",
          pros: "Zero risk of agent-issued refund mistakes",
          cons: "Slower e2e — human still has to click",
        },
        {
          label: "Check-and-apply with low ceiling",
          pros: "Faster",
          cons: "First wrongful refund kills merchant trust",
        },
        {
          label: "Check-and-apply gated by merchant flag",
          pros: "Customer-driven",
          cons: "Heavy support load when flag misconfigured",
        },
      ],
      decision: "Read-only — option 1.",
      rationale:
        "We're a draft-only product; writing money is out of scope until v2.",
      consequences: "Refunds remain a human-mediated 2-click flow. Acceptable.",
    }),
  ]);

  fillSection(state, deps, "agent-memory", [
    b("heading", { level: 2, text: "Memory model" }),
    b("paragraph", {
      markdown:
        "Saetbyeol is mostly stateless per ticket. The only persistent memory is per-merchant KB (re-ingested quarterly) and a per-conversation thread store that holds the last 8 turns.",
    }),
    b("code-block", {
      language: "ts",
      filename: "memory.ts",
      code: "type ThreadMemory = {\n  ticketId: string;\n  merchantId: string;\n  turns: Turn[];   // capped at 8, oldest evicted\n  intent?: Intent;\n  attachedOrderId?: string;\n  confidence?: number;\n};\n\ntype Turn = {\n  role: 'customer' | 'human_agent' | 'saetbyeol_draft';\n  text: string;\n  at: string; // ISO\n};\n\n// Long-lived memory: per-merchant KB index (Postgres + pgvector)\ntype KbDocument = {\n  id: string;\n  merchantId: string;\n  title: string;\n  body: string;\n  embedding: number[]; // 1024d\n  ingestedAt: string;\n};",
    }),
    b("table", {
      columns: ["Memory", "Lifetime", "Scope"],
      rows: [
        ["Thread turns", "Until ticket closes + 30d", "Per-ticket"],
        ["KB index", "Until next quarterly re-ingest", "Per-merchant"],
        ["Tool call log", "30 days", "Per-merchant"],
        ["Confidence calibration", "Rolling 14 days", "Global (pilot)"],
      ],
    }),
  ]);

  fillSection(state, deps, "agent-trigger", [
    b("heading", { level: 2, text: "Trigger conditions" }),
    b("checklist", {
      items: [
        {
          text: "Inbound Channel.io webhook with valid HMAC signature",
          checked: true,
        },
        {
          text: "Customer's first message in the thread (Saetbyeol does not handle agent-customer follow-ups)",
          checked: true,
        },
        {
          text: "Conversation is in a merchant on Saetbyeol's allowlist",
          checked: true,
        },
        {
          text: "Quiet hours respected — no Slack post 23:00–06:00 KST except hard escalations",
          checked: true,
        },
      ],
    }),
    b("table", {
      columns: ["Trigger", "Action"],
      rows: [
        ["webhook: message.created (customer)", "Run pipeline"],
        ["webhook: message.created (agent)", "Skip — humans handle follow-ups"],
        [
          "webhook: conversation.assigned (human)",
          "Pause future drafts on this thread",
        ],
        ["cron: 04:00 KST", "Re-ingest KB diff if any"],
      ],
    }),
  ]);

  fillSection(state, deps, "agent-examples", [
    b("heading", { level: 2, text: "Sample interactions" }),
    b("paragraph", {
      markdown: "Real customer language from pilot week 3, lightly anonymized.",
    }),
    b("blockquote", {
      text: "주문번호 KU-20260408-66231 새벽 6시까지 도착이라 했는데 8시 넘었는데도 안 와요.",
      cite: "Customer · 2026-04-08 08:12",
    }),
    b("blockquote", {
      text: "주문 확인했어요. KU-20260408-66231은 라이더 배차가 한 번 실패해서 재배차 중이에요. 예상 도착 08:55. 확인하고 다시 연락드릴게요. — 상담사 김OO",
      cite: "Saetbyeol draft · confidence 0.84",
    }),
    b("rule"),
    b("blockquote", {
      text: "어제 시킨 우유가 박스에 흘러 있었어요. 환불 가능한가요?",
      cite: "Customer · 2026-04-08 08:43",
    }),
    b("blockquote", {
      text: "주문 확인했어요. 손상 환불 정책상 우유 1팩 (₩4,200) 전액 환불 가능해요. 카드사로 24시간 안에 처리될 예정이에요. — 상담사 김OO",
      cite: "Saetbyeol draft · confidence 0.91",
    }),
    b("rule"),
    b("blockquote", {
      text: "혹시 글루텐프리 빵 재입고 언제 되나요?",
      cite: "Customer · 2026-04-08 09:01",
    }),
    b("blockquote", {
      text: "글루텐프리 식빵은 매주 화/금 입고예요. 다음 입고는 4/12(금) 새벽이에요. — 상담사 김OO",
      cite: "Saetbyeol draft · confidence 0.78 · cited KB#stock-cadence",
    }),
    b("rule"),
    b("blockquote", {
      text: "엄마 핸드폰으로 주문했는데 주소 잘못 적었어요 ㅠㅠ 바꿔주세요.",
      cite: "Customer · 2026-04-08 09:14",
    }),
    b("blockquote", {
      text: "[draft skipped — confidence 0.43, multi-topic + write action requested]",
      cite: "Saetbyeol · routed to human",
    }),
    b("rule"),
    b("blockquote", {
      text: "포장이 너무 따뜻해서 우유가 상한 것 같은데 마시고 배가 아파요.",
      cite: "Customer · 2026-04-08 09:33",
    }),
    b("blockquote", {
      text: "[hard escalation triggered — keywords: 상한, 배가 아파] paged @cs-lead",
      cite: "Saetbyeol · no draft",
    }),
  ]);

  fillSection(state, deps, "agent-failure", [
    b("heading", { level: 2, text: "Failure modes" }),
    b("risk", {
      risk: "Hallucinated order ID in draft",
      impact: "Customer trust — agent ships obviously-wrong info",
      impactLevel: "high",
      likelihood: "low",
      mitigation:
        "Draft must include a tool-cited order ID; mismatch fails validation",
      owner: "ML lead",
    }),
    b("risk", {
      risk: "KB drift — outdated policy promises in draft",
      impact: "Wrongful refund or denial",
      impactLevel: "high",
      likelihood: "medium",
      mitigation:
        "Quarterly re-ingest + document-age check; drafts older than 90d cite a 'verify' note",
      owner: "Ops",
    }),
    b("risk", {
      risk: "Merchant brand voice mismatch",
      impact: "Agents reject drafts → adoption drop",
      impactLevel: "medium",
      likelihood: "medium",
      mitigation:
        "Per-merchant tone fine-tune via prompt; weekly approval-rate review",
      owner: "Product",
    }),
    b("risk", {
      risk: "Channel.io webhook signature spoof",
      impact: "Forged ticket triggers tool calls",
      impactLevel: "high",
      likelihood: "low",
      mitigation: "HMAC verification + IP allowlist; secret rotation every 90d",
      owner: "Security",
    }),
    b("callout", {
      variant: "warn",
      title: "On graceful degradation",
      text: "When any tool fails, Saetbyeol still produces a draft if confidence stays above 0.6, but the draft is annotated with the tool failure for the human reviewer.",
    }),
  ]);

  fillSection(state, deps, "risks", [
    b("heading", { level: 2, text: "Risks & assumptions" }),
    b("risk", {
      risk: "Pilot merchant churns before standard tier conversion",
      impact: "Loss of reference customer + revenue",
      impactLevel: "high",
      likelihood: "medium",
      mitigation: "Weekly QBR + rotating exec sponsor",
      owner: "CEO",
    }),
    b("risk", {
      risk: "Anthropic API outage during rush",
      impact: "Drafts stop; humans handle full volume",
      impactLevel: "medium",
      likelihood: "low",
      mitigation: "Fallback to local Haiku-tier classifier + 'no draft' path",
      owner: "Eng lead",
    }),
    b("risk", {
      risk: "PIPA-related violation logging customer phone",
      impact: "Fine + reputational",
      impactLevel: "high",
      likelihood: "low",
      mitigation: "Redaction at ingest; bi-annual audit",
      owner: "법무 자문",
    }),
    b("risk", {
      risk: "Cost-per-ticket drifts above ₩90 break-even",
      impact: "Margin compression",
      impactLevel: "medium",
      likelihood: "medium",
      mitigation: "Token budget caps per turn; cheap classifier first",
      owner: "Eng lead",
    }),
  ]);

  fillSection(state, deps, "metrics", [
    b("heading", { level: 2, text: "Metrics & KPIs" }),
    b("metric", {
      name: "Draft approval rate",
      target: "75%",
      current: "81%",
      status: "ok",
      unit: "%",
      trend: "up",
    }),
    b("metric", {
      name: "Median agent response time",
      target: "<2 min",
      current: "1m 48s",
      status: "ok",
      unit: "",
      trend: "down",
    }),
    b("metric", {
      name: "Cost per ticket",
      target: "<₩90",
      current: "₩72",
      status: "ok",
      unit: "",
      trend: "down",
    }),
    b("metric", {
      name: "Tool failure rate",
      target: "<1%",
      current: "1.6%",
      status: "warn",
      unit: "%",
      trend: "down",
    }),
    b("metric", {
      name: "Hard-escalation precision",
      target: ">95%",
      current: "97%",
      status: "ok",
      unit: "%",
      trend: "flat",
    }),
  ]);

  // Inject a single "Runbook" agent-step block into the trigger section so the
  // agent-context renderer can show off the agent-step block too.
  const triggerSec = findSectionByKind(state, "agent-trigger");
  if (triggerSec) {
    appendBlocks(state, deps, triggerSec, "agent", [
      b("agent-step", {
        role: "input",
        spec: {
          source: "Channel.io webhook",
          path: "POST /v1/webhooks/channelio",
          schema: ["ticketId", "customerId", "message", "orderId?"],
          signatureHeader: "X-ChannelIO-Signature",
        },
      }),
    ]);
  }

  populateAgentExtras(state, deps);
  populateAgentExtrasTwo(state, deps);
  populateAgentGraph(state, deps);
}

function populateAgentExtrasTwo(state: AppState, deps: SeedDeps): void {
  fillSection(state, deps, "overview", [
    b("paragraph", {
      markdown:
        "**Customer scope.** Pre-dawn and same-day delivery grocers in KR (Kurly-style, Coupang Rocket Fresh-style). Not for restaurants, not for marketplace sellers.",
    }),
    b("paragraph", {
      markdown:
        "**Why now.** Channel.io's webhook stability passed our 30-day SLO threshold in 2025 Q4. Anthropic's Korean-language quality on Sonnet 4.6 cleared the 80% draft-approval bar in evals.",
    }),
    b("callout", {
      variant: "info",
      title: "Engagement model",
      text: "We charge per draft used. If humans skip the draft, we don't bill — keeps incentives aligned with merchant success.",
    }),
  ]);
  fillSection(state, deps, "agent-persona", [
    b("user-story", {
      as: "a CS lead",
      want: "to silence Saetbyeol on a specific thread when I take over",
      soThat: "Saetbyeol doesn't pile up drafts on a thread already handled",
      acceptance: [
        "Thread assignment to a human suppresses future drafts on that thread",
        "Suppression visible in Slack message",
        "Re-enable per-thread is one click",
      ],
      priority: "P0",
      estimate: "3 pts",
    }),
    b("user-story", {
      as: "a CS lead",
      want: "to see Saetbyeol's confidence and citations next to every draft",
      soThat: "I trust faster and audit faster",
      acceptance: [
        "Slack message includes confidence chip and KB doc IDs cited",
        "Click expands the cited KB excerpt",
        "Citation links survive KB re-ingest",
      ],
      priority: "P0",
      estimate: "5 pts",
    }),
    b("user-story", {
      as: "a merchant ops manager",
      want: "weekly approval-rate report by intent class",
      soThat: "I see where Saetbyeol is helping vs hurting",
      acceptance: [
        "Email every Monday 10:00 KST",
        "Per-class approval rate + sample bad drafts",
        "Trend vs prior week",
      ],
      priority: "P1",
      estimate: "5 pts",
    }),
  ]);
  fillSection(state, deps, "policy-general", [
    b("paragraph", {
      markdown:
        "**Per-merchant tone profile.** Each merchant has a tone JSON (formality level, banned phrases, preferred openings, currency formatting). Loaded into every draft prompt.",
    }),
    b("code-block", {
      language: "json",
      filename: "tone-profile.json",
      code: '{\n  "merchantId": "kurly-1",\n  "formality": "polite-terse",\n  "bannedPhrases": ["진심으로 사과드립니다", "불편을 드려 죄송합니다"],\n  "preferredOpenings": ["주문 확인했어요.", "확인했어요."],\n  "currency": { "locale": "ko-KR", "unit": "원" }\n}',
    }),
  ]);
  fillSection(state, deps, "agent-tools", [
    b("paragraph", {
      markdown:
        "**Adding a fourth tool.** Requires (1) merchant security review, (2) ADR with eval evidence, (3) gradual rollout per merchant feature flag.",
    }),
    b("table", {
      columns: ["Proposed tool", "Status", "Blocker"],
      rows: [
        [
          "delivery.eta.refresh",
          "evaluating",
          "needs merchant logistics API stable contract",
        ],
        [
          "sentiment.classify",
          "rejected",
          "low marginal value vs added complexity",
        ],
        ["coupon.suggest", "rejected", "creates risk of agent-issued promises"],
      ],
    }),
  ]);
  fillSection(state, deps, "agent-memory", [
    b("paragraph", {
      markdown:
        "**Cold-start behavior.** New merchant has no thread memory. KB-only drafting kicks in for the first ~50 tickets while the per-merchant tone profile is calibrated.",
    }),
    b("paragraph", {
      markdown:
        "**Confidence calibration store.** Rolling 14-day buffer of (predicted confidence, actual approval) tuples. Used to recalibrate the threshold per merchant if drift detected.",
    }),
  ]);
  fillSection(state, deps, "agent-trigger", [
    b("paragraph", {
      markdown:
        "**Quiet hours respected.** Outside 06:00–23:00 KST, drafts are queued and only posted if the human agent is online (Slack presence). This prevents queue overflow when nobody is watching.",
    }),
    b("checklist", {
      items: [
        { text: "Webhook signature verification", checked: true },
        { text: "Allowlist check on merchant ID", checked: true },
        { text: "Per-thread suppression check", checked: true },
        { text: "Quiet-hours check before Slack post", checked: true },
        { text: "Cost-cap check before LLM call", checked: true },
      ],
    }),
  ]);
  fillSection(state, deps, "agent-examples", [
    b("rule"),
    b("blockquote", {
      text: "주문한 거 빨리 좀 보내주세요 짜증나요",
      cite: "Customer · 2026-04-08 11:02",
    }),
    b("blockquote", {
      text: "주문 확인했어요. 라이더가 5분 안에 도착해요. 도착 즉시 알림 보내드릴게요. — 상담사 김OO",
      cite: "Saetbyeol draft · confidence 0.74",
    }),
    b("rule"),
    b("blockquote", {
      text: "어플에서 결제 오류 떠요. 도와주세요.",
      cite: "Customer · 2026-04-08 11:14",
    }),
    b("blockquote", {
      text: "[no draft — 결제 시스템 문의는 상담사가 직접 처리하는 정책]",
      cite: "Saetbyeol · routed to human (policy)",
    }),
  ]);
  fillSection(state, deps, "agent-failure", [
    b("paragraph", {
      markdown:
        "**Post-incident review.** Every wrong draft surfaced by a human reviewer triggers a same-day analysis. Pattern review weekly. Three same-pattern fails → tool/prompt change.",
    }),
    b("checklist", {
      items: [
        {
          text: "Wrong-draft Slack reaction (👎) writes to feedback log",
          checked: true,
        },
        { text: "Daily aggregate of 👎 by intent class", checked: true },
        { text: "Pattern review every Friday 14:00", checked: true },
      ],
    }),
    b("table", {
      columns: ["Pattern", "Count last 7d", "Status"],
      rows: [
        ["Wrong order ID cited", "0", "ok"],
        ["Tone too formal", "3", "monitor"],
        ["Cited stale KB doc", "1", "ok"],
        ["Multi-topic missed", "5", "fix in flight"],
      ],
    }),
  ]);
  fillSection(state, deps, "ops", [
    b("paragraph", {
      markdown:
        "**On-call.** One person on-call for tool failures + LLM outages. Pager fires on >5% pipeline error rate over 5 minutes.",
    }),
    b("checklist", {
      items: [
        { text: "Runbook in Notion linked from pager alert", checked: true },
        {
          text: "Anthropic status subscription in #cs-ops Slack",
          checked: true,
        },
        { text: "Quarterly chaos drill (kill orders.get)", checked: false },
      ],
    }),
  ]);
  fillSection(state, deps, "risks", [
    b("risk", {
      risk: "Korean toxicity model lags real-world abuse vocabulary",
      impact: "Hard escalation misses real emergencies",
      impactLevel: "high",
      likelihood: "low",
      mitigation:
        "Quarterly keyword review with merchant CS lead; anonymous tip channel",
      owner: "ML lead",
    }),
    b("risk", {
      risk: "Slack rate-limit during pre-dawn rush",
      impact: "Drafts delayed",
      impactLevel: "low",
      likelihood: "medium",
      mitigation: "Per-merchant Slack workspace + bot throttling",
      owner: "Eng lead",
    }),
  ]);
  fillSection(state, deps, "metrics", [
    b("metric", {
      name: "Pre-dawn rush coverage",
      target: "100%",
      current: "100%",
      status: "ok",
      unit: "%",
      trend: "flat",
    }),
    b("metric", {
      name: "Avg draft tokens",
      target: "<320",
      current: "284",
      status: "ok",
      unit: "tok",
      trend: "flat",
    }),
    b("metric", {
      name: "% drafts with KB citation",
      target: ">60%",
      current: "71%",
      status: "ok",
      unit: "%",
      trend: "up",
    }),
  ]);

  populateAgentExtrasThree(state, deps);
}

function populateAgentExtrasThree(state: AppState, deps: SeedDeps): void {
  fillSection(state, deps, "glossary", [
    b("definition", {
      term: "Pair (in CS context)",
      definition:
        "A merchant ↔ Saetbyeol relationship; one merchant has one Saetbyeol instance per environment.",
    }),
    b("definition", {
      term: "Approval reaction",
      definition:
        "Slack 👍/👎 reaction by a human agent indicating draft quality. Feeds back into per-merchant calibration.",
    }),
    b("definition", {
      term: "Override pattern",
      definition:
        "Per-merchant prompt fragment that customizes default behavior (e.g., 'always close with thanks').",
    }),
    b("definition", {
      term: "Sample-and-hold",
      definition:
        "Strategy where during peak load Saetbyeol drafts every Nth ticket only (N tuned per merchant).",
    }),
    b("definition", {
      term: "Drift detector",
      definition:
        "Rolling 1,000-draft sliding window measuring approval-rate decay.",
    }),
  ]);
  fillSection(state, deps, "agent-tools", [
    b("paragraph", {
      markdown:
        "**Tool determinism.** Tool inputs are normalized (trim whitespace, lowercase IDs where appropriate). Tool outputs are cached by input hash for the TTL above to avoid redundant cost.",
    }),
    b("code-block", {
      language: "ts",
      filename: "tool-cache.ts",
      code: "function cacheKey(tool: string, input: unknown): string {\n  return `${tool}:${stableHash(input)}`;\n}\n\nexport async function callTool<T>(tool: string, input: unknown, ttlSec: number): Promise<T> {\n  const key = cacheKey(tool, input);\n  const cached = await redis.get(key);\n  if (cached) return JSON.parse(cached);\n  const fresh = await execute<T>(tool, input);\n  await redis.set(key, JSON.stringify(fresh), 'EX', ttlSec);\n  return fresh;\n}",
    }),
    b("bullet-list", {
      ordered: false,
      items: [
        {
          text: "Each tool emits an OpenTelemetry span (input dim, output size, latency).",
        },
        { text: "Cache hit/miss counters fed to merchant dashboard." },
        {
          text: "Cache poisoning resistance: outputs are signed by tool worker.",
        },
      ],
    }),
  ]);
  fillSection(state, deps, "agent-failure", [
    b("risk", {
      risk: "Confidence calibration drifts after model update",
      impact: "Threshold becomes mis-tuned",
      impactLevel: "medium",
      likelihood: "high",
      mitigation:
        "Auto-recalibrate after each model deploy on a 200-sample warm set",
      owner: "ML lead",
    }),
    b("risk", {
      risk: "Slack reaction emojis used for unrelated reasons (e.g., kudos)",
      impact: "Feedback loop polluted",
      impactLevel: "low",
      likelihood: "high",
      mitigation: "Restrict 👍/👎 to bot-posted messages only",
      owner: "Eng lead",
    }),
  ]);
  fillSection(state, deps, "agent-examples", [
    b("rule"),
    b("blockquote", {
      text: "어플 깔았는데 회원가입이 안 돼요. 뭐가 문제죠?",
      cite: "Customer · 2026-04-08 11:32",
    }),
    b("blockquote", {
      text: "[no draft — 가입/계정 문의는 사람이 직접 처리하는 정책]",
      cite: "Saetbyeol · routed to human",
    }),
    b("rule"),
    b("blockquote", {
      text: "내일 새벽 배송 가능한가요? 사는 곳이 김포인데.",
      cite: "Customer · 2026-04-08 11:48",
    }),
    b("blockquote", {
      text: "김포는 새벽배송 가능 지역이에요. 23:00 전 주문 시 다음날 새벽 6시 전 도착이에요. — 상담사 김OO",
      cite: "Saetbyeol draft · confidence 0.85 · cited KB#delivery-zones",
    }),
    b("rule"),
    b("blockquote", {
      text: "배송 시간 변경할 수 있나요? 7시 이후로요.",
      cite: "Customer · 2026-04-08 12:01",
    }),
    b("blockquote", {
      text: "[draft skipped — 시간 변경 = write action; 정책상 사람 처리]",
      cite: "Saetbyeol · routed to human",
    }),
  ]);
  fillSection(state, deps, "ops", [
    b("paragraph", {
      markdown:
        "**Vendor management.** We maintain SLAs with Anthropic (LLM), Channel.io (ingest), and Slack (egress). Vendor incidents are tracked in the same incident system as our own.",
    }),
    b("table", {
      columns: ["Vendor", "Tier", "Failure mode"],
      rows: [
        ["Anthropic", "Tier 2", "Pause draft posting; route all to humans"],
        [
          "Channel.io",
          "Tier 1 (single source)",
          "Backpressure on webhook ingest, queue locally",
        ],
        ["Slack", "Tier 1 (egress)", "Email digest fallback to senior CS lead"],
      ],
    }),
  ]);
  fillSection(state, deps, "metrics", [
    b("metric", {
      name: "Per-merchant approval rate",
      target: ">75%",
      current: "81%",
      status: "ok",
      unit: "%",
      trend: "up",
    }),
    b("metric", {
      name: "False hard-escalation rate",
      target: "<2%",
      current: "1.4%",
      status: "ok",
      unit: "%",
      trend: "flat",
    }),
    b("metric", {
      name: "Calibration recovery time",
      target: "<24h",
      current: "11h",
      status: "ok",
      unit: "h",
      trend: "flat",
    }),
  ]);
  fillSection(state, deps, "risks", [
    b("risk", {
      risk: "Cache poisoning from compromised tool worker",
      impact: "Bad data influences drafts",
      impactLevel: "high",
      likelihood: "low",
      mitigation: "Signed cache entries + worker-mTLS",
      owner: "Security",
    }),
    b("risk", {
      risk: "Slack outage during pre-dawn rush",
      impact: "Drafts queued but not visible",
      impactLevel: "medium",
      likelihood: "low",
      mitigation: "Email digest fallback after 5 min Slack failure",
      owner: "Eng lead",
    }),
    b("risk", {
      risk: "Anthropic prompt cache eviction during deploy",
      impact: "Cost spike + latency",
      impactLevel: "low",
      likelihood: "medium",
      mitigation: "Pre-warm common prompt prefixes after each deploy",
      owner: "Eng lead",
    }),
    b("risk", {
      risk: "Per-merchant tone profile contradicts global policy",
      impact: "Customer-facing drafts violate brand",
      impactLevel: "medium",
      likelihood: "low",
      mitigation:
        "Policy linter checks tone JSON against global rules at upload",
      owner: "Product",
    }),
  ]);
  fillSection(state, deps, "metrics", [
    b("metric", {
      name: "Cache hit savings",
      target: ">₩400k/mo",
      current: "₩520k/mo",
      status: "ok",
      unit: "",
      trend: "up",
    }),
    b("metric", {
      name: "Per-thread suppression respect",
      target: "100%",
      current: "100%",
      status: "ok",
      unit: "%",
      trend: "flat",
    }),
    b("metric", {
      name: "Vendor-incident impact (last 90d)",
      target: "<2 incidents",
      current: "1",
      status: "ok",
      unit: "",
      trend: "flat",
    }),
  ]);
  fillSection(state, deps, "agent-failure", [
    b("paragraph", {
      markdown:
        "**Postmortem template.** Every approval-rate drop > 5pt over 24h triggers a postmortem with: (1) trigger event, (2) detection lag, (3) blast radius, (4) corrective action, (5) prevention.",
    }),
  ]);
}

function populateAgentExtras(state: AppState, deps: SeedDeps): void {
  fillSection(state, deps, "glossary", [
    b("definition", {
      term: "Pre-dawn rush",
      definition:
        "06:00–07:30 KST window when 70%+ of CS volume lands. Saetbyeol's primary value-prop window.",
    }),
    b("definition", {
      term: "Confidence calibration",
      definition:
        "Process of mapping raw classifier confidence to expected approval rate. Re-fit every 14 days.",
    }),
    b("definition", {
      term: "Allowlist",
      definition:
        "Static list of merchant IDs whose tickets Saetbyeol is permitted to draft against.",
    }),
    b("definition", {
      term: "Hard escalation keyword",
      definition:
        "Predefined Korean phrases (allergic reaction, food poisoning, lost high-value package) that bypass all drafting.",
    }),
    b("definition", {
      term: "Multi-topic ticket",
      definition:
        "Ticket where the customer's message contains 2+ distinct intents above 0.5 confidence each.",
    }),
    b("definition", {
      term: "Draft footer",
      definition:
        "Auto-appended block including agent signature placeholder and tool-call citation list.",
    }),
    b("definition", {
      term: "Cost ceiling",
      definition:
        "Per-merchant monthly token budget. When approached, Saetbyeol switches to cheaper Haiku-only flow.",
    }),
    b("definition", {
      term: "Shadow mode",
      definition:
        "Operational mode where drafts are produced but not posted; used for offline scoring during pilot weeks 1–2.",
    }),
    b("definition", {
      term: "Gold set",
      definition:
        "Frozen set of 200 historical tickets with ground-truth replies; used for quarterly model re-eval.",
    }),
  ]);

  fillSection(state, deps, "agent-persona", [
    b("paragraph", {
      markdown:
        "**Saetbyeol's authority.** Read-only. Never writes to merchant systems. Never sends customer-visible messages.",
    }),
    b("paragraph", {
      markdown:
        "**Saetbyeol's identity to customers.** None. Customers never see Saetbyeol's name. The human agent's name appears as the sender.",
    }),
    b("paragraph", {
      markdown:
        "**Saetbyeol's failure handling.** When uncertain, default to human routing. Cost of a missed draft is a few seconds of agent time. Cost of a wrong draft is brand damage.",
    }),
  ]);

  fillSection(state, deps, "ops", [
    b("decision", {
      question: "Should we self-host the embedding model or use a hosted API?",
      status: "accepted",
      context: "KB search uses dense retrieval. Cost-vs-latency trade-off.",
      options: [
        {
          label: "Hosted API (OpenAI / Cohere / Voyage)",
          pros: "No infra, fastest path",
          cons: "Per-call cost; data leaves boundary",
        },
        {
          label: "Self-hosted (BGE-M3 on GPU)",
          pros: "Cost stable, data stays in-region",
          cons: "GPU ops complexity",
        },
      ],
      decision: "Self-hosted BGE-M3 on a single A10 GPU.",
      rationale:
        "Pilot merchant requires data residency in KR. Hosted APIs would need a special contract.",
      consequences:
        "Eng must own GPU on-call rotation. Compensated by predictable cost.",
    }),
    b("table", {
      columns: ["Pipeline step", "Median latency", "p95 latency"],
      rows: [
        ["Webhook receive", "12ms", "38ms"],
        ["Intent classify", "180ms", "620ms"],
        ["Tool calls (parallel)", "240ms", "780ms"],
        ["Draft generation", "1.4s", "3.2s"],
        ["Slack post", "120ms", "410ms"],
        ["End-to-end", "2.0s", "4.8s"],
      ],
    }),
    b("paragraph", {
      markdown:
        "**Re-eval cadence.** Every 14 days we score the last 1,000 drafts against approval rate. Drift > 5pt triggers a calibration run.",
    }),
  ]);

  fillSection(state, deps, "agent-tools", [
    b("paragraph", {
      markdown:
        "**Why exactly three tools.** Every additional tool roughly doubles the search space the planner has to reason over. We constrain to three until evals show the value of a fourth.",
    }),
    b("code-block", {
      language: "json",
      filename: "orders.get response sample",
      code: '{\n  "order_id": "KU-20260408-66231",\n  "placed_at": "2026-04-08T05:42:00+09:00",\n  "status": "in_transit",\n  "items": [\n    { "sku": "milk-1L", "qty": 2, "price": 3900 }\n  ],\n  "delivery_window": { "from": "05:00", "to": "07:00" },\n  "rider_assigned_at": "2026-04-08T06:15:00+09:00",\n  "signals": { "rider_late": true }\n}',
    }),
    b("code-block", {
      language: "json",
      filename: "kb.search response sample",
      code: '{\n  "matches": [\n    {\n      "doc_id": "kb-stock-cadence",\n      "title": "입고 일정",\n      "snippet": "글루텐프리 식빵은 매주 화/금 입고됩니다.",\n      "score": 0.84\n    }\n  ]\n}',
    }),
    b("paragraph", {
      markdown:
        "**Tool error envelope.** Every tool returns a standard `{ ok, data, error? }` shape so the LLM step does not have to reason about provider-specific failure formats.",
    }),
    b("table", {
      columns: ["Tool", "Cost / call", "Cache TTL"],
      rows: [
        ["orders.get", "₩0.4", "30s"],
        ["kb.search", "₩2.1", "5min"],
        ["refund.policy.check", "₩0.1", "60min"],
      ],
    }),
  ]);

  fillSection(state, deps, "agent-memory", [
    b("paragraph", {
      markdown:
        "**Why bounded thread memory.** Long threads fill the prompt and dilute relevance. 8 turns covers >95% of pilot tickets.",
    }),
    b("code-block", {
      language: "ts",
      filename: "embed.ts",
      code: "export async function embed(text: string): Promise<number[]> {\n  const out = await bge.encode(text, { normalize: true });\n  if (out.length !== 1024) throw new Error('embedding dim mismatch');\n  return out;\n}",
    }),
    b("paragraph", {
      markdown:
        "**KB ingest pipeline.** markdown → chunk(800 tokens, 80 overlap) → embed → upsert into pgvector. Diff job compares chunk hashes; only changed chunks re-embed.",
    }),
  ]);

  fillSection(state, deps, "agent-trigger", [
    b("paragraph", {
      markdown:
        "**Burst handling.** During pre-dawn rush, ingest can spike to 30 tickets/min for one merchant. We process serially per ticket but parallelize across tickets, with a per-merchant concurrency cap of 8.",
    }),
    b("table", {
      columns: ["Concurrency knob", "Default", "Tunable"],
      rows: [
        ["Per-merchant draft concurrency", "8", "Yes (config)"],
        ["Per-merchant tool-call concurrency", "16", "Yes (config)"],
        ["Global LLM RPM", "300", "Provider-side"],
      ],
    }),
  ]);

  fillSection(state, deps, "agent-examples", [
    b("rule"),
    b("blockquote", {
      text: "결제는 됐는데 주문 내역에 안 보여요. 무슨 문제인가요?",
      cite: "Customer · 2026-04-08 09:48",
    }),
    b("blockquote", {
      text: "주문 확인했어요. 결제 후 1–2분 지연될 수 있어요. 지금은 정상적으로 처리됐어요. 도착 예정은 내일 새벽이에요. — 상담사 김OO",
      cite: "Saetbyeol draft · confidence 0.79",
    }),
    b("rule"),
    b("blockquote", {
      text: "냉동 상품 받았는데 다 녹아 있었어요. 환불 + 재배송 가능한가요?",
      cite: "Customer · 2026-04-08 10:02",
    }),
    b("blockquote", {
      text: "[multi-topic — 냉동 손상 환불 + 재배송 요청] confidence 0.71. 환불 정책 검증 결과: 가능. 재배송은 인간 검토 필요.",
      cite: "Saetbyeol · partial draft routed to human",
    }),
    b("rule"),
    b("blockquote", {
      text: "어제 받은 상품 라벨에 영양 정보가 다른데, 알레르기 반응이 있어요.",
      cite: "Customer · 2026-04-08 10:14",
    }),
    b("blockquote", {
      text: "[hard escalation — 알레르기 키워드] paged @cs-lead. 드래프트 생성 안 함.",
      cite: "Saetbyeol · no draft, lead paged",
    }),
    b("rule"),
    b("blockquote", {
      text: "기프트 카드 잔액 어떻게 확인해요?",
      cite: "Customer · 2026-04-08 10:32",
    }),
    b("blockquote", {
      text: "기프트 카드 잔액은 마이페이지 → 결제수단 → 기프트 카드에서 확인할 수 있어요. 최근 거래 내역도 같이 보여요. — 상담사 김OO",
      cite: "Saetbyeol draft · confidence 0.88 · cited KB#gift-card-faq",
    }),
  ]);

  fillSection(state, deps, "agent-failure", [
    b("paragraph", {
      markdown:
        "**Recovery ladder.** When the pipeline fails, Saetbyeol degrades in this order: (1) drop tools, (2) drop draft, (3) flag ticket as 'human-only'. We never silently swallow a failure.",
    }),
    b("table", {
      columns: ["Failure", "Detection", "Action"],
      rows: [
        ["Tool 5xx", "Provider HTTP code", "Retry once, then no-tool draft"],
        [
          "LLM provider outage",
          "Heartbeat ping fails 3x",
          "Pause draft posting; route all tickets to humans",
        ],
        [
          "KB index stale",
          "Last-ingest > 90d",
          "Annotate drafts with 'verify' note",
        ],
        [
          "Webhook flood",
          "Rate exceeds 60/min/merchant",
          "Shed lower-priority tickets; alert ops",
        ],
        [
          "Cost cap exceeded",
          "Daily token spend > budget",
          "Switch to Haiku-only flow",
        ],
      ],
    }),
    b("decision", {
      question:
        "Should we ever send a draft when the order lookup tool failed?",
      status: "accepted",
      context:
        "Tool failures happen ~1.6% of the time. Without order context, drafts can still help on generic intents.",
      options: [
        {
          label: "Always require successful tool calls",
          pros: "No misleading drafts",
          cons: "Drops 1.6% of value",
        },
        {
          label: "Allow draft if confidence > 0.75 without tool",
          pros: "Preserves value",
          cons: "Risk of draft missing key context",
        },
        {
          label: "Allow draft but annotate 'tool failure' in Slack",
          pros: "Human can decide",
          cons: "Slightly more cognitive load",
        },
      ],
      decision: "Option 3 — annotate and let human decide.",
      rationale:
        "Humans are in the loop anyway; annotation is cheap and preserves agency.",
      consequences:
        "Slack message renderer must support a 'tool failure' chip.",
    }),
  ]);

  fillSection(state, deps, "risks", [
    b("risk", {
      risk: "Channel.io webhook payload schema changes",
      impact: "Pipeline halts",
      impactLevel: "high",
      likelihood: "low",
      mitigation:
        "Schema validator on ingest; versioned consumer; weekly contract test",
      owner: "Eng lead",
    }),
    b("risk", {
      risk: "Pilot merchant fires Saetbyeol after a single high-profile bad draft",
      impact: "Reference-customer loss",
      impactLevel: "high",
      likelihood: "medium",
      mitigation: "Daily approval-rate tripwire + rollback playbook",
      owner: "CEO",
    }),
    b("risk", {
      risk: "Korean-tone drift after model upgrade",
      impact: "Approval rate drops",
      impactLevel: "medium",
      likelihood: "medium",
      mitigation: "Tone gold set + canary deploy + human spot-check",
      owner: "ML lead",
    }),
    b("risk", {
      risk: "Embedding model loses precision on KR-specific synonyms",
      impact: "KB search misses",
      impactLevel: "medium",
      likelihood: "medium",
      mitigation: "Hybrid BM25 + dense; add Korean synonyms dictionary",
      owner: "ML lead",
    }),
  ]);

  fillSection(state, deps, "metrics", [
    b("metric", {
      name: "Draft p95 latency",
      target: "<3s",
      current: "3.2s",
      status: "warn",
      unit: "s",
      trend: "down",
    }),
    b("metric", {
      name: "Hallucination rate (manual audit)",
      target: "<0.5%",
      current: "0.3%",
      status: "ok",
      unit: "%",
      trend: "flat",
    }),
    b("metric", {
      name: "Tool cache hit rate",
      target: ">60%",
      current: "54%",
      status: "warn",
      unit: "%",
      trend: "up",
    }),
    b("metric", {
      name: "Cost per merchant per month",
      target: "<₩2.5M",
      current: "₩1.8M",
      status: "ok",
      unit: "",
      trend: "up",
    }),
    b("metric", {
      name: "Re-eval drift (gold set)",
      target: "<5pt",
      current: "2.1pt",
      status: "ok",
      unit: "pt",
      trend: "flat",
    }),
  ]);
}

function populateAgentGraph(state: AppState, deps: SeedDeps): void {
  const ingest = addAgentNode(state, deps, "input", "신규 CS 티켓 수신", {
    source: "Channel.io webhook",
    path: "POST /v1/webhooks/channelio",
    schema: ["ticketId", "customerId", "message", "orderId?"],
  });
  const classify = addAgentNode(state, deps, "llm", "의도 분류", {
    model: "claude-haiku-4-5",
    classes: ["배송지연", "오배송", "환불", "상품문의", "기타"],
    confidenceThreshold: 0.6,
  });
  const orderLookup = addAgentNode(state, deps, "tool", "주문 조회", {
    tool: "orders.get",
    scopes: ["orders:read"],
    branchWhen: ["배송지연", "오배송", "환불"],
  });
  const kbSearch = addAgentNode(state, deps, "tool", "KB 검색", {
    tool: "kb.search",
    index: "cs-handbook",
    branchWhen: ["상품문의", "기타"],
  });
  const refundCheck = addAgentNode(state, deps, "tool", "환불 가능 여부 검증", {
    tool: "refund.policy.check",
    branchWhen: ["환불"],
  });
  const draft = addAgentNode(state, deps, "llm", "응답 초안 작성", {
    model: "claude-sonnet-4-6",
    tone: "정중·간결",
    maxSentences: 3,
  });
  const post = addAgentNode(
    state,
    deps,
    "output",
    "상담사 인박스에 초안 게시",
    {
      channel: "Slack #cs-drafts",
      needsHumanReview: true,
      fallback: "no_draft + flagForHuman",
    },
  );

  addAgentEdge(state, deps, ingest.id, classify.id);
  addAgentEdge(state, deps, classify.id, orderLookup.id);
  addAgentEdge(state, deps, classify.id, kbSearch.id);
  addAgentEdge(state, deps, orderLookup.id, refundCheck.id);
  addAgentEdge(state, deps, refundCheck.id, draft.id);
  addAgentEdge(state, deps, kbSearch.id, draft.id);
  addAgentEdge(state, deps, draft.id, post.id);
}
