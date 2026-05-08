import type { AppState } from "@/builder/types/state";
import {
  addScreen,
  addScreenEdge,
  appendBlocks,
  b,
  fillSection,
  findSectionByKind,
  type SeedDeps,
} from "./helpers";

// ─────────────────────────────────────────────────────────────────────────────
// demo-web — "Janggu" (장구)
// 동네 골목상권 자영업자용 배달앱 통합 운영 SaaS — 배민/쿠팡이츠/요기요 통합
// 주문·메뉴·정산·직원 관리 대시보드. B2B SaaS.
// ─────────────────────────────────────────────────────────────────────────────

export function populateWebSeed(state: AppState, deps: SeedDeps): void {
  fillSection(state, deps, "overview", [
    b("heading", {
      level: 1,
      text: "Janggu (장구) — Operations OS for street-shop owners",
    }),
    b("paragraph", {
      markdown:
        "Janggu pulls Baemin, Coupang Eats, and Yogiyo into one console so a Korean street-food owner can run the dinner rush from a single tab. Today they juggle three tablets, three sound alerts, and a stack of receipts — Janggu replaces that mess with one prioritized board, one menu source-of-truth, and one weekly settlement view.",
    }),
    b("paragraph", {
      markdown:
        "**Why now.** Korean delivery aggregators stabilized their public APIs through 2025; commission caps under the Fair Trade Commission's 2025 guideline pushed owners to demand cost transparency tooling.",
    }),
    b("callout", {
      variant: "info",
      title: "Stage",
      text: "Closed beta with 28 stores in Mapo-gu / Yongsan-gu. GA target 2026 Q3.",
    }),
    b("stat", {
      label: "Active beta stores",
      value: "28",
      change: "+9 MoM",
      changeKind: "up",
    }),
    b("stat", {
      label: "Avg orders / store / day",
      value: "73",
      change: "+12%",
      changeKind: "up",
    }),
    b("stat", {
      label: "Time to settle weekly payout",
      value: "9 min",
      change: "-71%",
      changeKind: "down",
    }),
    b("checklist", {
      items: [
        { text: "Beta close (M0) — 28 stores onboarded", checked: true },
        { text: "Aggregator API contract signed (M1)", checked: true },
        { text: "Multi-store dashboard (M2)", checked: true },
        { text: "Settlement reconciliation v1 (M3)", checked: false },
        { text: "Inventory & purchasing module (M4)", checked: false },
        { text: "Public launch on Owner App Store (M5)", checked: false },
      ],
    }),
    b("rule"),
    b("paragraph", {
      markdown:
        "**Non-goals.** Janggu does not replace POS hardware, does not handle in-store table service, and does not offer customer-facing ordering — those stay with the aggregators.",
    }),
  ]);

  fillSection(state, deps, "personas", [
    b("heading", { level: 2, text: "Who Janggu is built for" }),
    b("paragraph", {
      markdown:
        "Three people sit on the other side of every Janggu screen. We ship for the owner first — they pay — but Dispatcher Dana is the one who lives in the product 9 hours a day.",
    }),
    b("persona", {
      name: "사장님 박민호",
      role: "Owner-operator, 1-store chicken franchise (Mapo-gu)",
      demographics: "42세, 자영업 11년차, 매장 직원 4명",
      goals: [
        "Cut weekly settlement reconciliation from half a day to under 30 minutes",
        "See per-platform commission impact on margin in one place",
        "Stop missing orders during 7–9pm rush",
      ],
      needs: [
        "One unified order list across all aggregators",
        "Plain-Korean explanation of every fee line",
        "Mobile-friendly view to check sales while away",
      ],
      pains: [
        "Three tablets ringing at the same time during rush",
        "Aggregator settlement statements use different formats and column names",
        "Menu price changes require editing 3 backoffice consoles separately",
      ],
      quote:
        "주문 폭주할 때 화면 다 띄워놓고 보기 힘들어요. 한 곳에서만 보고 싶어요.",
    }),
    b("persona", {
      name: "Dispatcher Dana (다은)",
      role: "Front-of-house staff manning the order screen",
      demographics:
        "27세, part-time 4 days/wk, primary computer user in the store",
      goals: [
        "Move every incoming order to 'preparing' within 90 seconds",
        "Re-route on rider rejection without phone calls",
        "Hand the owner a clean shift summary at close",
      ],
      needs: [
        "Big touch targets — she works gloved",
        "Audio cue tuned for kitchen noise",
        "Undo for accidental cancel taps",
      ],
      pains: [
        "Misclicking 'cancel' on the wrong row",
        "Sound bleeding between tablets makes it impossible to tell which platform pinged",
        "Customer phone numbers buried 3 taps deep when a refund call comes in",
      ],
      quote:
        "취소 버튼이랑 완료 버튼이 너무 가까워요. 한 번 잘못 누르면 환불 처리해야 해요.",
    }),
    b("persona", {
      name: "Ops Lead 오지현",
      role: "Janggu internal — runs onboarding + customer success",
      demographics: "31세, ex-Baemin BD, manages 28 beta stores",
      goals: [
        "Onboard a new store in under 45 minutes including 3 aggregator OAuth flows",
        "Catch failing aggregator webhooks before the owner notices",
        "Convert 60%+ of beta stores to paid in M5",
      ],
      needs: [
        "Health dashboard for every store's API status",
        "Bulk message tool to ping owners about aggregator outages",
        "Settlement diff alerts (Janggu's number vs aggregator number)",
      ],
      pains: [
        "Aggregator OAuth flows break silently every 60 days when refresh tokens expire",
        "No way to tell which stores have stale menus without manually opening each one",
      ],
      quote: "사장님이 모르는 장애를 우리가 먼저 잡는 게 핵심이에요.",
    }),
    b("rule"),
    b("user-story", {
      as: "an owner",
      want: "see today's net revenue across all platforms with fees deducted",
      soThat:
        "I know how much actually lands in my account before I look at the bank app",
      acceptance: [
        "Top-bar shows GMV, total fees, net — refreshed every 5 min",
        "Tap fee chip → breakdown by platform with commission %",
        "Net matches bank deposit within ±100원 for the prior week",
      ],
      priority: "P0",
      estimate: "5 pts",
    }),
    b("user-story", {
      as: "Dispatcher Dana",
      want: "the active order column to never scroll past 10 items",
      soThat:
        "I can see every in-flight order without losing focus during rush",
      acceptance: [
        "Density mode collapses completed rows after 30s",
        "Backpressure warning appears when >10 active orders queue",
        "Audio cue distinguishes new vs rider-cancel vs delay",
      ],
      priority: "P0",
      estimate: "3 pts",
    }),
    b("user-story", {
      as: "Ops Lead",
      want: "a list of stores whose aggregator menu drifted from Janggu's source",
      soThat: "I can fix it before a customer orders a sold-out item",
      acceptance: [
        "Daily diff job runs 04:00 KST",
        "Drift summary email lands by 06:00 KST",
        "Drift dashboard filterable by aggregator and severity",
      ],
      priority: "P1",
      estimate: "8 pts",
    }),
  ]);

  fillSection(state, deps, "glossary", [
    b("heading", { level: 2, text: "Glossary" }),
    b("paragraph", {
      markdown:
        "Vocabulary used in product, support, and sales conversations. Owners and aggregators use overlapping but inconsistent terms — this is our normalized dictionary.",
    }),
    b("definition", {
      term: "정산 사이클 (Settlement cycle)",
      definition:
        "Window during which orders are tallied for owner payout. Baemin: weekly Mon→Sun, paid Thu. Coupang Eats: bi-weekly. Yogiyo: weekly.",
    }),
    b("definition", {
      term: "GMV",
      definition:
        "Gross Merchandise Value — sum of order subtotals before fees and refunds. Janggu shows GMV in won, exclusive of VAT.",
    }),
    b("definition", {
      term: "Take-rate",
      definition:
        "Aggregator commission as a percentage of order subtotal. Currently 6.8% (Baemin Express), 9.8% (Coupang Eats), 12% (Yogiyo Plus).",
    }),
    b("definition", {
      term: "Rider rejection (배차 만료)",
      definition:
        "Aggregator cancels an order because no rider accepted within the timeout. Janggu re-broadcasts to other platforms when configured.",
    }),
    b("definition", {
      term: "Menu drift",
      definition:
        "State where the menu in Janggu's source-of-truth disagrees with what the aggregator console actually serves. Caused by manual edits in the aggregator app.",
    }),
    b("definition", {
      term: "Soft outage",
      definition:
        "An aggregator API responds but with stale or partial data. Distinguished from hard outage (5xx).",
    }),
    b("definition", {
      term: "정산서 (Settlement statement)",
      definition:
        "PDF/CSV statement issued by the aggregator at the end of each cycle, listing per-order fees, adjustments, and net payout.",
    }),
    b("definition", {
      term: "Quiet hours",
      definition:
        "Owner-configured window (default 02:00–10:00 KST) during which Janggu suppresses non-critical notifications.",
    }),
    b("definition", {
      term: "Auto-accept",
      definition:
        "Setting that has Janggu confirm orders automatically below an owner-set value threshold and within open hours. Off by default.",
    }),
  ]);

  // ── Policy
  fillSection(state, deps, "policy-general", [
    b("heading", { level: 3, text: "General handling" }),
    b("paragraph", {
      markdown:
        "Default rules that apply when no special situation overrides them. Owners can override per-store; staff cannot.",
    }),
    b("checklist", {
      items: [
        {
          text: "Confirm a new order within 90 seconds or auto-escalate to owner phone",
          checked: true,
        },
        {
          text: "Refunds initiated by staff require owner approval if amount > 30,000원",
          checked: true,
        },
        {
          text: "Aggregator commission disputes are filed within 48 h of statement issue",
          checked: true,
        },
        { text: "Stale menu detection runs daily 04:00 KST", checked: true },
      ],
    }),
    b("paragraph", {
      markdown:
        "**Audit trail.** Every state change on an order (accept / reject / refund / re-route) writes an immutable event with actor + timestamp. Owners and ops can view but not edit the trail.",
    }),
    b("callout", {
      variant: "info",
      title: "On accidental cancellations",
      text: "Cancels are reversible for 10 seconds via the toast undo. After 10s, the aggregator has been notified — a refund flow is the only path back.",
    }),
  ]);

  fillSection(state, deps, "policy-special", [
    b("heading", { level: 3, text: "Special situations" }),
    b("callout", {
      variant: "warn",
      title: "Aggregator outage",
      text: "When a platform's API has been 5xx for >3 consecutive minutes, Janggu posts a banner and pauses auto-accept for that platform. Manual ordering still works.",
    }),
    b("callout", {
      variant: "error",
      title: "Sold-out cascade",
      text: "If an item flips to sold-out during rush, Janggu pushes the change to all 3 aggregators within 5s. Customers mid-checkout see the item disappear; refunds are auto-issued for the rare race.",
    }),
    b("callout", {
      variant: "success",
      title: "Weather surge",
      text: "When Korea Meteorological Administration issues a heavy rain alert for the store's gu, Janggu offers a one-tap menu narrowing (delivery-only mode) to keep prep tractable.",
    }),
    b("paragraph", {
      markdown:
        "These overrides are **opt-in per store**. Default is off because the noise/risk profile differs by cuisine and area.",
    }),
  ]);

  fillSection(state, deps, "policy-writing", [
    b("heading", { level: 3, text: "Writing & tone" }),
    b("paragraph", {
      markdown:
        "Janggu speaks Korean to owners and English to staff in international franchises. Korean voice: 정중하지만 짧게 (polite but terse) — owners are mid-rush. Avoid honorific stacks past one level; never use '하시기 바랍니다'.",
    }),
    b("table", {
      columns: ["Attribute", "Yes", "No"],
      rows: [
        ["Length", "Under 14 글자 for buttons", "긴 설명문"],
        [
          "Tone",
          "정중·간결 (예: '주문 확정')",
          "딱딱함 (예: '주문을 확정하시기 바랍니다')",
        ],
        ["Errors", "원인 + 다음 행동", "기술 용어, stack trace"],
        ["Numbers", "원 단위, 천 단위 콤마", "소수점, $ 표기"],
      ],
    }),
    b("paragraph", {
      markdown:
        "**Examples.** ✅ '환불 처리됐어요.' ✅ '아직 배차 안 됐어요.' ❌ '환불 트랜잭션이 성공적으로 완료되었습니다.' ❌ 'Order has been refunded successfully.'",
    }),
  ]);

  fillSection(state, deps, "policy-error", [
    b("heading", { level: 3, text: "Error messages" }),
    b("paragraph", {
      markdown:
        "Every error visible to the owner has a code, an owner-facing line, and a recovery path. Internal-only errors live in logs.",
    }),
    b("table", {
      columns: ["Code", "User-facing message (KO)", "Recovery"],
      rows: [
        [
          "AGG-001",
          "배민 연결이 끊겼어요. 다시 연결할게요.",
          "Auto-retry x3, then prompt owner to re-auth",
        ],
        [
          "AGG-002",
          "쿠팡이츠에서 메뉴 동기화가 멈췄어요.",
          "Owner taps 'sync now' or waits for next 04:00 cron",
        ],
        ["ORD-101", "이 주문은 이미 취소됐어요.", "Refresh order list"],
        [
          "ORD-102",
          "라이더가 안 잡혀서 주문이 만료됐어요.",
          "Re-broadcast or refund (1 tap each)",
        ],
        [
          "SET-201",
          "정산 금액이 안 맞아요. 우리가 확인 중이에요.",
          "Ops auto-paged; owner sees 'in review' chip",
        ],
        [
          "SET-202",
          "지난주 정산서가 아직 안 도착했어요.",
          "Wait until Thu 12:00 KST, then auto-escalate",
        ],
      ],
    }),
    b("callout", {
      variant: "info",
      title: "Tone reminder",
      text: "Error copy is Korean by default; English copy is the responsibility of i18n review (see Tech architecture).",
    }),
  ]);

  // ── Business plan
  fillSection(state, deps, "business", [
    b("heading", { level: 2, text: "Business plan" }),
    b("paragraph", {
      markdown:
        "Janggu monetizes per-store SaaS subscription with a free tier capped at 50 orders/day. The thesis: owners save ≥4 hours of admin/week, which is worth more than the subscription on day one.",
    }),
    b("table", {
      columns: [
        "Tier",
        "Price (월)",
        "Order cap",
        "Stores",
        "Settlement reconciliation",
        "Priority support",
      ],
      rows: [
        ["Free", "0원", "50/day", "1", "Manual export", "Community"],
        ["Owner", "29,000원", "Unlimited", "1", "Automated", "Email 24h"],
        [
          "Owner Plus",
          "59,000원",
          "Unlimited",
          "Up to 3",
          "Automated + drift alerts",
          "Slack 4h",
        ],
        [
          "Franchise",
          "Quote",
          "Unlimited",
          "Unlimited",
          "Automated + bulk APIs",
          "Dedicated CSM",
        ],
      ],
    }),
    b("numbered-list", {
      ordered: true,
      items: [
        "Acquisition: partnerships with KB Kookmin / Shinhan small-business loan officers (existing trust channel).",
        "Activation: target 'first settled week' under 7 days from signup — biggest predictor of retention.",
        "Retention: Owner Plus stickiness driven by drift alerts that nobody else offers.",
        "Referral: in-product referral coupon worth 1 free month for both sides.",
      ],
    }),
    b("metric", {
      name: "MRR",
      target: "120,000,000원",
      current: "31,400,000원",
      status: "warn",
      unit: "",
      trend: "up",
    }),
    b("metric", {
      name: "Gross margin",
      target: "78%",
      current: "71%",
      status: "ok",
      unit: "%",
      trend: "up",
    }),
    b("metric", {
      name: "Payback period",
      target: "<6 mo",
      current: "9.2 mo",
      status: "warn",
      unit: "",
      trend: "down",
    }),
  ]);

  fillSection(state, deps, "ops", [
    b("heading", { level: 2, text: "Ops & lifecycle" }),
    b("numbered-list", {
      ordered: true,
      items: [
        "Discovery call (15 min) — Ops Lead confirms aggregator coverage and store category.",
        "Self-serve signup → email magic link.",
        "Aggregator OAuth wizard (Baemin → Coupang Eats → Yogiyo).",
        "Menu import & sanity check (auto if all 3 have a menu, manual reconcile otherwise).",
        "Test order placed against staging menu — confirms full pipeline.",
        "First live shift with Ops Lead in shared Slack channel for 2 hours.",
      ],
    }),
    b("checklist", {
      items: [
        {
          text: "Sev-1 incident: page on-call within 5 min, status page update within 15",
          checked: true,
        },
        { text: "Daily aggregator health digest at 09:00 KST", checked: true },
        {
          text: "Weekly customer-success review every Wed 14:00",
          checked: true,
        },
        { text: "Monthly settlement diff audit by finance", checked: false },
      ],
    }),
    b("table", {
      columns: ["Day", "Primary", "Secondary", "Manager"],
      rows: [
        ["Mon", "민호", "지현", "재훈"],
        ["Tue", "지현", "예린", "재훈"],
        ["Wed", "예린", "민호", "재훈"],
        ["Thu", "재훈", "민호", "지현"],
        ["Fri", "민호", "재훈", "지현"],
        ["Sat", "지현", "예린", "재훈"],
        ["Sun", "예린", "민호", "재훈"],
      ],
    }),
    b("decision", {
      question:
        "Should we run our own kitchen-display device or stay browser-only?",
      status: "accepted",
      context:
        "Owners with 2+ stores asked for a dedicated tablet build. We considered shipping a pre-imaged Android device.",
      options: [
        {
          label: "Browser-only (current)",
          pros: "Zero hardware liability, instant updates",
          cons: "Owners on aging tablets see lag",
        },
        {
          label: "Pre-imaged Android tablet",
          pros: "Predictable perf, brand presence",
          cons: "Hardware support cost, RMA process",
        },
        {
          label: "Recommend tablet, don't ship",
          pros: "Predictable perf without liability",
          cons: "Owners hate hardware shopping",
        },
      ],
      decision: "Recommend tablet, don't ship — option 3.",
      rationale:
        "We are 6 people; hardware liability would dominate the roadmap. We publish a recommended tablet list updated quarterly.",
      consequences:
        "We must keep PWA performance budget tight (TTI <2.5s on 4-yr-old Android) since customers won't always buy the recommended device.",
    }),
  ]);

  fillSection(state, deps, "tech", [
    b("heading", { level: 2, text: "Tech architecture" }),
    b("paragraph", {
      markdown:
        "Janggu is a Next.js 16 App Router app with a Bun runtime, a Postgres primary, and a per-tenant Redis stream for real-time order events. Aggregator integrations are isolated in worker processes that translate platform-specific shapes into a normalized internal event schema.",
    }),
    b("bullet-list", {
      ordered: false,
      items: [
        {
          text: "Web app: Next.js 16, React 19.2, React Compiler enabled, Tailwind v4.",
        },
        {
          text: "API: Next route handlers + tRPC for owner console; REST for aggregator webhooks.",
        },
        { text: "DB: Postgres 16 with Drizzle ORM. Read replicas in 2 AZs." },
        {
          text: "Realtime: Redis Streams + SSE to the browser. WebSocket fallback for admin tools.",
        },
        {
          text: "Workers: Bun-based jobs in a separate fly.io app for menu sync, settlement reconciliation, drift detection.",
        },
        {
          text: "Observability: OpenTelemetry → Grafana Cloud. PII scrubbed at the SDK layer.",
        },
      ],
    }),
    b("code-block", {
      language: "txt",
      filename: "system-overview.txt",
      code: "[Owner browser] ──SSE──┐\n                       │\n[Staff browser] ──SSE──┤\n                       ▼\n              [janggu-web (Next 16)]\n                       │\n        ┌──────────────┼──────────────┐\n        ▼              ▼              ▼\n  [Postgres 16]   [Redis Streams]  [Object store]\n                       │\n        ┌──────────────┼──────────────┐\n        ▼              ▼              ▼\n  [baemin-worker] [coupang-worker] [yogiyo-worker]\n        │              │              │\n        ▼              ▼              ▼\n   Baemin API    Coupang Eats     Yogiyo API",
    }),
    b("table", {
      columns: ["Concern", "Choice", "Why"],
      rows: [
        ["Runtime", "Bun", "Faster cold start for workers; project standard"],
        ["DB", "Postgres 16", "Mature ecosystem, RLS available"],
        ["ORM", "Drizzle", "Type-safe migrations, edge-friendly"],
        [
          "Realtime",
          "Redis Streams + SSE",
          "Lower ops cost than Kafka, fits 28-store scale",
        ],
        ["Auth", "Magic link + 2FA", "Owners hate passwords"],
        [
          "Hosting",
          "Vercel (web) + fly.io (workers)",
          "DX vs. long-running constraint",
        ],
      ],
    }),
    b("decision", {
      question: "Which realtime transport for the order board?",
      status: "accepted",
      context:
        "We need to push order state changes to the browser within 500ms p95. Owners' tablets sit behind aggressive corporate proxies in some cases.",
      options: [
        {
          label: "WebSocket",
          pros: "Bidirectional, low overhead",
          cons: "Proxies and locked-down networks block it; reconnect logic is non-trivial",
        },
        {
          label: "Server-Sent Events (SSE)",
          pros: "Plain HTTP, friendly to proxies, simpler reconnect",
          cons: "One-way; we'd add HTTP POST for client→server",
        },
        {
          label: "HTTP long-poll",
          pros: "Universal",
          cons: "Wasteful at our event rate",
        },
      ],
      decision: "SSE for server→client, plain POST for client→server.",
      rationale:
        "Half of our beta stores sit behind ISP proxies that mishandle WS upgrades. SSE just works there.",
      consequences:
        "We accept extra POST overhead for 'accept order' actions and skip bidirectional features (e.g., presence) for v1.",
    }),
    b("paragraph", {
      markdown:
        "**Performance budget.** TTI ≤ 2.5s on a Galaxy Tab A 2019 over 4G; order-list update e2e ≤ 500ms p95.",
    }),
  ]);

  fillSection(state, deps, "api", [
    b("heading", { level: 2, text: "API design" }),
    b("paragraph", {
      markdown:
        "Owner-facing API uses tRPC over the same Next process. Aggregators talk to us via REST webhooks. All endpoints are versioned via URL prefix (/v1/...).",
    }),
    b("code-block", {
      language: "ts",
      filename: "router.ts (excerpt)",
      code: "export const orderRouter = t.router({\n  list: t.procedure\n    .input(z.object({\n      storeId: z.string().uuid(),\n      status: z.enum(['new','preparing','dispatched','done','cancelled']).optional(),\n      limit: z.number().int().min(1).max(100).default(50),\n    }))\n    .query(({ input, ctx }) => orderService.list(ctx, input)),\n\n  accept: t.procedure\n    .input(z.object({ orderId: z.string().uuid() }))\n    .mutation(({ input, ctx }) => orderService.accept(ctx, input.orderId)),\n\n  refund: t.procedure\n    .input(z.object({\n      orderId: z.string().uuid(),\n      reason: z.enum(['out_of_stock','wrong_item','customer_request','rider_lost']),\n      amount: z.number().int().min(0),\n    }))\n    .mutation(({ input, ctx }) => orderService.refund(ctx, input)),\n});",
    }),
    b("code-block", {
      language: "http",
      filename: "POST /v1/webhooks/baemin/order",
      code: 'POST /v1/webhooks/baemin/order HTTP/1.1\nHost: api.janggu.kr\nX-Baemin-Signature: t=1759...&v1=8a...\nContent-Type: application/json\n\n{\n  "event": "order.created",\n  "order_id": "BM-2026-04-09-7723",\n  "store_id": "baemin-store-2210",\n  "items": [{ "sku": "chk-fried-half", "qty": 1, "price": 11900 }],\n  "placed_at": "2026-04-09T18:42:11+09:00"\n}',
    }),
    b("code-block", {
      language: "http",
      filename: "GET /v1/stores/{id}/settlement",
      code: 'GET /v1/stores/0fa...c2/settlement?from=2026-04-01&to=2026-04-07 HTTP/1.1\nHost: api.janggu.kr\nAuthorization: Bearer ey...\n\n200 OK\n{\n  "period": { "from": "...", "to": "..." },\n  "gmv": 5_240_300,\n  "fees": { "baemin": 356_341, "coupang": 198_000, "yogiyo": 144_500 },\n  "refunds": 41_900,\n  "net": 4_499_559,\n  "diff_vs_aggregator": 0\n}',
    }),
    b("table", {
      columns: ["Endpoint", "Auth", "Rate limit"],
      rows: [
        ["POST /v1/orders/{id}/accept", "Owner JWT", "120/min/store"],
        [
          "POST /v1/orders/{id}/refund",
          "Owner JWT + 2FA if >30k",
          "30/min/store",
        ],
        ["GET /v1/stores/{id}/settlement", "Owner JWT", "60/min/store"],
        [
          "POST /v1/webhooks/{platform}/order",
          "Platform HMAC",
          "Unbounded (idempotent)",
        ],
        ["POST /v1/menu/{storeId}/sync", "Owner JWT", "10/min/store"],
      ],
    }),
  ]);

  fillSection(state, deps, "data", [
    b("heading", { level: 2, text: "Data model" }),
    b("paragraph", {
      markdown:
        "Single Postgres database with row-level security enforcing per-tenant isolation. The aggregator-side raw payloads are kept in a separate `events_raw` table for forensics — owner-visible data joins through `events_normalized`.",
    }),
    b("code-block", {
      language: "sql",
      filename: "schema.sql (excerpt)",
      code: "create table store (\n  id uuid primary key,\n  owner_id uuid not null references owner(id),\n  name text not null,\n  category text not null,\n  gu text not null,\n  created_at timestamptz default now()\n);\n\ncreate table order_record (\n  id uuid primary key,\n  store_id uuid not null references store(id),\n  platform text not null check (platform in ('baemin','coupang','yogiyo')),\n  platform_order_id text not null,\n  status text not null,\n  subtotal int not null,\n  fees int not null,\n  refund_amount int not null default 0,\n  placed_at timestamptz not null,\n  unique (platform, platform_order_id)\n);\n\ncreate index order_store_status on order_record(store_id, status, placed_at desc);",
    }),
    b("table", {
      columns: ["Entity", "Purpose", "Cardinality"],
      rows: [
        [
          "owner",
          "Account holder",
          "~1 per store, 1:N to store for franchises",
        ],
        [
          "store",
          "Physical location with its own aggregator IDs",
          "N per owner",
        ],
        [
          "order_record",
          "Normalized order across platforms",
          "~50–200/day/store",
        ],
        ["menu_item", "Source-of-truth menu row", "~30–80 per store"],
        [
          "settlement_period",
          "Weekly/bi-weekly bucket per platform",
          "~150/year/store",
        ],
        ["audit_event", "Immutable state change log", "~3× orders"],
      ],
    }),
  ]);

  fillSection(state, deps, "risks", [
    b("heading", { level: 2, text: "Risks & assumptions" }),
    b("risk", {
      risk: "Aggregator API access revoked or commercially restricted",
      impact:
        "Janggu can't read or push for that platform — direct revenue impact",
      impactLevel: "high",
      likelihood: "medium",
      mitigation:
        "Maintain owner-credentials fallback (read-only via OAuth) so we degrade rather than fail",
      owner: "재훈 (CEO)",
    }),
    b("risk", {
      risk: "Settlement reconciliation discrepancy > 1%",
      impact: "Loss of trust — owner switches back to spreadsheet",
      impactLevel: "high",
      likelihood: "low",
      mitigation: "Daily diff job + 'in review' chip + 24h SLA to explain",
      owner: "지현 (Ops)",
    }),
    b("risk", {
      risk: "Galaxy Tab A 2019 perf below budget after React 19 upgrade",
      impact: "Owners on aging hardware report lag during rush",
      impactLevel: "medium",
      likelihood: "medium",
      mitigation:
        "Performance budget gate in CI; hardware lab with 3 reference devices",
      owner: "민호 (Eng Lead)",
    }),
    b("risk", {
      risk: "PIPA-related fine for storing customer phone numbers without explicit consent",
      impact: "Up to 3% of annual revenue + reputation",
      impactLevel: "high",
      likelihood: "low",
      mitigation:
        "Hash phone numbers at ingest; clear-text only for active refund cases <72h",
      owner: "법무 자문 (외부)",
    }),
  ]);

  fillSection(state, deps, "metrics", [
    b("heading", { level: 2, text: "North-star and supporting metrics" }),
    b("metric", {
      name: "Net Revenue Retention",
      target: "115%",
      current: "104%",
      status: "warn",
      unit: "%",
      trend: "up",
    }),
    b("metric", {
      name: "Settlement reconciliation diff",
      target: "< 0.1%",
      current: "0.08%",
      status: "ok",
      unit: "%",
      trend: "flat",
    }),
    b("metric", {
      name: "Order accept p95 latency",
      target: "< 500ms",
      current: "412ms",
      status: "ok",
      unit: "ms",
      trend: "down",
    }),
    b("metric", {
      name: "Aggregator OAuth refresh success",
      target: "> 99.5%",
      current: "98.7%",
      status: "warn",
      unit: "%",
      trend: "down",
    }),
    b("metric", {
      name: "Beta → paid conversion",
      target: "60%",
      current: "39%",
      status: "bad",
      unit: "%",
      trend: "up",
    }),
  ]);

  populateWebExtras(state, deps);
  populateWebExtrasTwo(state, deps);

  // ── Screens
  populateWebScreens(state, deps);
}

function populateWebExtrasTwo(state: AppState, deps: SeedDeps): void {
  fillSection(state, deps, "overview", [
    b("paragraph", {
      markdown:
        "**Geographic focus.** Seoul + Suwon for v1. Busan + Incheon planned 2026 Q4 once Yogiyo's regional API quirks are tamed.",
    }),
    b("paragraph", {
      markdown:
        "**Founding team.** 6 people — 2 eng, 1 design, 1 ops, 1 BD, 1 finance. Deliberately small until M5; we hire after retention proves out.",
    }),
    b("callout", {
      variant: "success",
      title: "Beta highlight",
      text: "Mapo-gu owner Park Min-ho cut his weekly bookkeeping from 4h to 22 min in week 3 of beta.",
    }),
  ]);
  fillSection(state, deps, "personas", [
    b("paragraph", {
      markdown:
        "**Anti-personas.** Janggu is *not* for franchise corporate ops, dark-store operators, or pure delivery-only businesses with no in-store presence — those need different feature shapes (multi-tenant fleet routing, ghost kitchen integrations) we're not building.",
    }),
    b("user-story", {
      as: "an owner finishing for the day",
      want: "a one-screen close-out summary by 23:00",
      soThat: "I can lock the door without paperwork",
      acceptance: [
        "Auto-emails the summary at close",
        "Includes refund total and tomorrow's prep hints",
        "PDF format for tax records",
      ],
      priority: "P2",
      estimate: "5 pts",
    }),
    b("user-story", {
      as: "an Ops Lead during outage",
      want: "to send a bulk DM to affected owners in under 2 min",
      soThat: "we beat the customer support flood",
      acceptance: [
        "Outage detector pre-builds the recipient list",
        "DM template editable last-minute",
        "Send confirmation + delivery receipt per recipient",
      ],
      priority: "P1",
      estimate: "5 pts",
    }),
  ]);
  fillSection(state, deps, "policy-general", [
    b("paragraph", {
      markdown:
        "**Owner override authority.** Per-store overrides are limited to: Quiet hours, Auto-accept threshold, Refund auto-approval cap. Other policy fields are global.",
    }),
    b("table", {
      columns: ["Override", "Default", "Min", "Max"],
      rows: [
        ["Auto-accept threshold", "30,000원", "0", "100,000원"],
        ["Refund auto-approval cap", "10,000원", "0", "30,000원"],
        ["Quiet hours start", "02:00", "22:00", "03:00"],
        ["Quiet hours end", "10:00", "08:00", "12:00"],
      ],
    }),
  ]);
  fillSection(state, deps, "tech", [
    b("paragraph", {
      markdown:
        "**Performance contract.** Each PR runs a Lighthouse CI gate. Order board must stay above score 80; regressions block merge unless waived by tech lead.",
    }),
    b("code-block", {
      language: "yaml",
      filename: ".github/workflows/lh.yml (excerpt)",
      code: "lhci:\n  collect:\n    url:\n      - https://staging.janggu.kr/orders\n      - https://staging.janggu.kr/menu\n    numberOfRuns: 3\n  assert:\n    assertions:\n      'categories:performance': ['error', { minScore: 0.80 }]\n      'first-contentful-paint': ['error', { maxNumericValue: 1500 }]",
    }),
    b("bullet-list", {
      ordered: false,
      items: [
        { text: "Bundle budget: 220 KB JS gzipped on the order board route." },
        { text: "Image budget: order thumbnails ≤ 18 KB AVIF." },
        { text: "Server response: TTFB ≤ 250ms p95 from Seoul region." },
      ],
    }),
  ]);
  fillSection(state, deps, "api", [
    b("paragraph", {
      markdown:
        "**Versioning.** Breaking changes ship under a new URL prefix (/v2/...). Old prefix supported for 12 months minimum.",
    }),
    b("code-block", {
      language: "ts",
      filename: "errors.ts",
      code: "export type ApiError = {\n  code: string;\n  message: string;\n  meta?: Record<string, unknown>;\n};\n\nexport function err(code: string, message: string, meta?: Record<string, unknown>): never {\n  throw Object.assign(new Error(message), { code, meta });\n}",
    }),
  ]);
  fillSection(state, deps, "data", [
    b("bullet-list", {
      ordered: false,
      items: [
        {
          text: "Backups: continuous WAL shipping to S3 with PITR up to 7 days.",
        },
        { text: "Disaster recovery RTO: 1 hour. RPO: 5 minutes." },
        { text: "Quarterly DR drill on a clone DB." },
      ],
    }),
  ]);
  fillSection(state, deps, "ops", [
    b("paragraph", {
      markdown:
        "**Customer success motion.** Each beta store has a named CS owner. Weekly 15-min check-in until first paid month closes.",
    }),
    b("checklist", {
      items: [
        { text: "Run shadow shift in week 1", checked: true },
        { text: "Settlement walk-through in week 2", checked: true },
        { text: "Health-check call in week 4", checked: false },
      ],
    }),
  ]);
  fillSection(state, deps, "metrics", [
    b("metric", {
      name: "First-month-paid retention",
      target: ">90%",
      current: "84%",
      status: "warn",
      unit: "%",
      trend: "up",
    }),
    b("metric", {
      name: "Webhook ingest p95",
      target: "<300ms",
      current: "210ms",
      status: "ok",
      unit: "ms",
      trend: "flat",
    }),
    b("metric", {
      name: "Status page subscriber count",
      target: ">50%",
      current: "61%",
      status: "ok",
      unit: "%",
      trend: "up",
    }),
  ]);
  fillSection(state, deps, "risks", [
    b("risk", {
      risk: "Status page outage during a Sev-1",
      impact: "Communication failure compounds incident",
      impactLevel: "medium",
      likelihood: "low",
      mitigation: "Redundant status surface (Slack + SMS to subscribed owners)",
      owner: "지현 (Ops)",
    }),
    b("risk", {
      risk: "Korean kitchen-noise vs audio cue volume conflict",
      impact: "Missed orders despite ringing",
      impactLevel: "medium",
      likelihood: "high",
      mitigation: "Per-store volume calibration; visual flash on tablet bezel",
      owner: "민호 (Eng Lead)",
    }),
    b("risk", {
      risk: "VAT rate change forces retroactive settlement recompute",
      impact: "Owner-facing numbers shift",
      impactLevel: "low",
      likelihood: "low",
      mitigation:
        "Settlement snapshots immutable; recompute writes a new period",
      owner: "재훈 (CEO)",
    }),
    b("risk", {
      risk: "Aggregator app forces re-OAuth during rush",
      impact: "Pipeline silently drops",
      impactLevel: "high",
      likelihood: "medium",
      mitigation: "Token-expiry monitor + 7-day owner pre-warning",
      owner: "민호 (Eng Lead)",
    }),
  ]);
  fillSection(state, deps, "glossary", [
    b("definition", {
      term: "Re-broadcast",
      definition:
        "Re-emit a rejected order to other aggregators after 90s if rider not assigned.",
    }),
    b("definition", {
      term: "Token-expiry monitor",
      definition:
        "Background job flagging refresh tokens expiring within 7 days.",
    }),
    b("definition", {
      term: "Backpressure warning",
      definition:
        "UI indicator when active orders exceed dispatcher's tracked capacity.",
    }),
    b("definition", {
      term: "Status page subscription",
      definition:
        "Owner-side opt-in to email + SMS alerts about Janggu incidents.",
    }),
  ]);
}

// Additional content to push the demo to 200+ blocks. Each section here adds
// material that an actual PM would write — more glossary terms, more risks,
// more ADRs, deeper API/data sections — not filler.
function populateWebExtras(state: AppState, deps: SeedDeps): void {
  fillSection(state, deps, "glossary", [
    b("definition", {
      term: "OAuth refresh window",
      definition:
        "60-day rolling window during which an aggregator-issued refresh token must be exchanged or it expires silently.",
    }),
    b("definition", {
      term: "Drift severity",
      definition:
        "Three-tier classification of menu drift. low: cosmetic copy diff. medium: option price diff. high: item availability diff.",
    }),
    b("definition", {
      term: "VAT-inclusive vs exclusive",
      definition:
        "Owners see exclusive (without VAT) by default since payouts net VAT. Toggle in Settings.",
    }),
    b("definition", {
      term: "Dwell time",
      definition:
        "Time between order acceptance and rider pickup. Tracked per platform; surfaces as a Dispatcher Dana KPI.",
    }),
    b("definition", {
      term: "Auto-pause",
      definition:
        "Janggu pauses auto-accept on a platform after >3 consecutive 5xx errors in 3 minutes.",
    }),
    b("definition", {
      term: "Hand-off",
      definition:
        "When the active shift ends, the platform sends owners a one-screen summary of unresolved orders and refunds.",
    }),
  ]);

  fillSection(state, deps, "personas", [
    b("user-story", {
      as: "an owner managing 3 stores",
      want: "switch active store from a single dropdown without re-login",
      soThat: "I can monitor multiple locations without juggling tabs",
      acceptance: [
        "Top-bar store switcher visible on every page",
        "Switch reflects within 200ms (cached snapshot)",
        "Audit log records the switch as a separate session segment",
      ],
      priority: "P1",
      estimate: "5 pts",
    }),
    b("user-story", {
      as: "Dispatcher Dana on a 10-inch tablet",
      want: "tappable rows tall enough not to misclick",
      soThat: "I never refund a wrong order due to a slip",
      acceptance: [
        "Row height ≥ 56px on screens <11 inches",
        "Cancel button separated from accept by ≥48px",
        "10-second toast undo on every destructive action",
      ],
      priority: "P0",
      estimate: "3 pts",
    }),
    b("user-story", {
      as: "an owner reviewing settlements",
      want: "filter the statement view by aggregator and week",
      soThat: "I can spot a single platform's anomaly fast",
      acceptance: [
        "Filter chips persist across navigations",
        "Diff column highlights >1% gap with a warn badge",
        "CSV export respects current filter",
      ],
      priority: "P1",
      estimate: "5 pts",
    }),
    b("user-story", {
      as: "Ops Lead",
      want: "page on-call when 3+ stores see the same aggregator outage",
      soThat: "we contact owners proactively",
      acceptance: [
        "Outage detector groups by aggregator + 5-min window",
        "Slack alert with affected store list",
        "One-click bulk message to owners",
      ],
      priority: "P0",
      estimate: "8 pts",
    }),
  ]);

  fillSection(state, deps, "ops", [
    b("paragraph", {
      markdown:
        "**Incident response.** Every Sev-1 has a designated incident commander, scribe, and customer-comms owner. The IC runs the bridge; the scribe captures decisions; the customer-comms owner posts to the status page within 15 min.",
    }),
    b("table", {
      columns: ["Severity", "Definition", "Page who", "Customer comms"],
      rows: [
        [
          "Sev-1",
          "Order pipeline broken for ≥1 store",
          "On-call + IC + Comms",
          "Status page within 15m",
        ],
        [
          "Sev-2",
          "Degraded perf for ≥10 stores",
          "On-call",
          "Status page within 60m",
        ],
        ["Sev-3", "Single-store anomaly", "On-call (work hours)", "Direct DM"],
        ["Sev-4", "Cosmetic / non-blocking", "Ticket queue", "None"],
      ],
    }),
    b("decision", {
      question: "Status-page hosting: self-roll vs Statuspage.io?",
      status: "accepted",
      context:
        "We need a public status surface owners can subscribe to. Build cost vs vendor cost.",
      options: [
        {
          label: "Statuspage.io",
          pros: "Plug-and-play, sub workflows free",
          cons: "$300+/mo at our scale",
        },
        {
          label: "Self-roll",
          pros: "Custom branding, free",
          cons: "On-call effort to maintain",
        },
      ],
      decision: "Statuspage.io for v1; revisit at 100 stores.",
      rationale: "Owner trust > cost optimization at this stage.",
      consequences: "Vendor lock-in to Atlassian; acceptable.",
    }),
    b("checklist", {
      items: [
        {
          text: "Pre-mortem before every Sev-1 reproducer goes to staging",
          checked: true,
        },
        { text: "Postmortem within 48h, blameless template", checked: true },
        { text: "Action items get JIRA ticket within 72h", checked: true },
        { text: "RCA shared with affected owners by email", checked: false },
      ],
    }),
  ]);

  fillSection(state, deps, "tech", [
    b("paragraph", {
      markdown:
        "**Multi-tenant model.** Each store is one tenant. We use a single Postgres database with row-level-security policies on store_id. Aggregator workers are stateless and scale by message volume; one worker can process events for many stores.",
    }),
    b("decision", {
      question: "Postgres RLS vs schema-per-tenant?",
      status: "accepted",
      context:
        "We expect <500 stores in year-1 and <50,000 in year-3. Migration cost matters.",
      options: [
        {
          label: "Single DB + RLS",
          pros: "Simpler ops, shared connection pool",
          cons: "Noisy-neighbor risk for hot tenants",
        },
        {
          label: "Schema-per-tenant",
          pros: "Hard isolation",
          cons: "Migration fan-out grows linearly",
        },
        {
          label: "DB-per-tenant",
          pros: "Maximum isolation",
          cons: "Untenable at scale",
        },
      ],
      decision:
        "Single DB + RLS. Revisit if any one tenant generates >5% of write volume.",
      rationale:
        "We optimize for migration sanity; the noisy-neighbor risk is manageable with workload classes.",
      consequences:
        "All migrations must be RLS-aware. Linter rule enforces this.",
    }),
    b("code-block", {
      language: "sql",
      filename: "rls-policy.sql",
      code: "alter table order_record enable row level security;\n\ncreate policy tenant_isolation on order_record\n  using (store_id = current_setting('app.current_store_id')::uuid);\n\ncreate policy ops_full_access on order_record\n  for all to ops_role using (true);",
    }),
    b("bullet-list", {
      ordered: false,
      items: [
        {
          text: "Feature flags via Unleash; flags evaluated server-side and pushed to clients via SSE.",
        },
        { text: "Background jobs in BullMQ on Redis 7." },
        {
          text: "Image upload pipeline: presigned PUT to S3, then a sharp-based worker generates thumbnails.",
        },
        { text: "i18n via Lingui — Korean default, English fallback." },
      ],
    }),
  ]);

  fillSection(state, deps, "api", [
    b("code-block", {
      language: "ts",
      filename: "settlement-router.ts",
      code: "export const settlementRouter = t.router({\n  list: t.procedure\n    .input(z.object({ storeId: z.string().uuid(), year: z.number().int(), week: z.number().int().optional() }))\n    .query(({ input, ctx }) => settlementService.list(ctx, input)),\n  reconcile: t.procedure\n    .input(z.object({ storeId: z.string().uuid(), periodId: z.string().uuid() }))\n    .mutation(({ input, ctx }) => settlementService.reconcile(ctx, input)),\n});",
    }),
    b("code-block", {
      language: "http",
      filename: "POST /v1/webhooks/coupang/order",
      code: 'POST /v1/webhooks/coupang/order HTTP/1.1\nHost: api.janggu.kr\nX-CE-Signature: t=..., v1=...\n\n{\n  "event": "order.placed",\n  "orderId": "CE-A82-7723",\n  "storeRef": "ce-store-1188",\n  "items": [...],\n  "deliveryFee": 3000\n}',
    }),
    b("paragraph", {
      markdown:
        "**Idempotency.** Every webhook handler keys on (platform, platform_order_id, event). Duplicate events return 200 with `{idempotent: true}` rather than re-processing.",
    }),
    b("table", {
      columns: ["Webhook", "Retries (aggregator)", "Our SLO ack"],
      rows: [
        ["Baemin order.placed", "5 with backoff", "<200ms p95"],
        ["Coupang order.placed", "3 with backoff", "<200ms p95"],
        ["Yogiyo order.placed", "10 with fixed delay", "<300ms p95"],
        ["Settlement issued", "2", "<1s p95 (heavy)"],
      ],
    }),
  ]);

  fillSection(state, deps, "data", [
    b("code-block", {
      language: "sql",
      filename: "audit-and-events.sql",
      code: "create table audit_event (\n  id uuid primary key,\n  store_id uuid not null,\n  actor_kind text not null check (actor_kind in ('owner','staff','system','aggregator')),\n  actor_id uuid,\n  entity_kind text not null,\n  entity_id uuid not null,\n  event text not null,\n  payload jsonb not null,\n  at timestamptz default now()\n);\n\ncreate index audit_store_at on audit_event(store_id, at desc);\n\ncreate table events_raw (\n  id uuid primary key,\n  platform text not null,\n  payload jsonb not null,\n  received_at timestamptz default now()\n);",
    }),
    b("paragraph", {
      markdown:
        "**Retention.** `events_raw` is kept 90 days; `audit_event` is kept 7 years (statutory). Both are partitioned by month.",
    }),
    b("table", {
      columns: ["Field", "PII", "Encryption at rest"],
      rows: [
        ["customer_phone", "yes", "Tokenized via Vault"],
        ["customer_address", "yes", "Tokenized via Vault"],
        ["order_subtotal", "no", "Standard"],
        ["staff_name", "yes", "Standard, RLS-gated"],
      ],
    }),
  ]);

  fillSection(state, deps, "risks", [
    b("risk", {
      risk: "Compliance audit reveals incomplete consent records for marketing emails",
      impact: "Fine + suspension of email campaign",
      impactLevel: "medium",
      likelihood: "low",
      mitigation:
        "Consent capture at signup logged with timestamp + IP; quarterly review",
      owner: "재훈 (CEO)",
    }),
    b("risk", {
      risk: "Aggregator changes commission structure mid-quarter",
      impact: "Settlement reconciliation diff balloons",
      impactLevel: "medium",
      likelihood: "medium",
      mitigation:
        "Commission table is data, not code; ops can update within 1 hour",
      owner: "지현 (Ops)",
    }),
    b("risk", {
      risk: "Owner accidentally invites a competitor as staff",
      impact: "Data leak of menu pricing",
      impactLevel: "low",
      likelihood: "medium",
      mitigation:
        "Staff invites use scoped roles; menu edit requires owner-tier",
      owner: "민호 (Eng Lead)",
    }),
    b("risk", {
      risk: "Settlement CSV export contains full customer phone numbers",
      impact: "PIPA violation",
      impactLevel: "high",
      likelihood: "low",
      mitigation:
        "Export is hashed by default; raw export gated behind owner 2FA + audit log",
      owner: "법무 자문",
    }),
  ]);

  fillSection(state, deps, "metrics", [
    b("metric", {
      name: "Median order accept time",
      target: "<60s",
      current: "47s",
      status: "ok",
      unit: "",
      trend: "down",
    }),
    b("metric", {
      name: "Stores with menu drift > 0",
      target: "<5%",
      current: "8%",
      status: "warn",
      unit: "%",
      trend: "down",
    }),
    b("metric", {
      name: "Refund rate",
      target: "<3%",
      current: "2.4%",
      status: "ok",
      unit: "%",
      trend: "flat",
    }),
    b("metric", {
      name: "Customer NPS (owner)",
      target: ">40",
      current: "31",
      status: "warn",
      unit: "",
      trend: "up",
    }),
    b("metric", {
      name: "Lighthouse perf (Order board)",
      target: ">85",
      current: "78",
      status: "warn",
      unit: "",
      trend: "up",
    }),
  ]);
}

function populateWebScreens(state: AppState, deps: SeedDeps): void {
  // The seed already created one default screen named "Home" in
  // buildSeedSnapshot. Repurpose it into "Order board" (the workhorse) and add
  // 3 more.
  const defaultScreenId = state.currentScreenId;
  const orderBoardId =
    defaultScreenId ?? addScreen(state, deps, "Order board", "/orders").id;
  if (defaultScreenId && state.screens[defaultScreenId]) {
    state.screens[defaultScreenId].title = "Order board";
    state.screens[defaultScreenId].route = "/orders";
  }

  // Landing
  const landing = addScreen(state, deps, "Landing", "/");
  appendBlocks(state, deps, landing.id, "app", [
    b("nav", {
      items: [
        { label: "Product", href: "/product" },
        { label: "Pricing", href: "/pricing" },
        { label: "Stories", href: "/stories" },
        { label: "Login", href: "/login" },
      ],
    }),
    b("hero", {
      title: "주문 폭주에도 흔들리지 않게.",
      subtitle: "배민·쿠팡이츠·요기요를 한 화면에서. 정산은 자동으로.",
      cta: "무료로 시작하기",
    }),
    b("stat", {
      label: "Avg orders/day/store",
      value: "73",
      change: "+12%",
      changeKind: "up",
    }),
    b("stat", {
      label: "Reconcile time saved",
      value: "9 → 1.3h/wk",
      change: "",
      changeKind: "none",
    }),
    b("stat", {
      label: "Beta stores",
      value: "28",
      change: "+9 MoM",
      changeKind: "up",
    }),
    b("card-grid", {
      columns: 3,
      cards: [
        {
          title: "Unified order board",
          desc: "Three platforms, one keyboard.",
        },
        {
          title: "Auto reconciliation",
          desc: "Settlement diffs flagged in 5s.",
        },
        { title: "Menu source-of-truth", desc: "Edit once, push to all." },
        { title: "Drift alerts", desc: "Catch sold-outs before customers do." },
        {
          title: "Korean-first",
          desc: "Built with Mapo-gu owners, not for them.",
        },
        { title: "Mobile-friendly", desc: "Check sales from a sauna." },
      ],
    }),
    b("cta-section", {
      title: "이번 주 정산부터 자동으로.",
      body: "Owner 플랜은 7일 무료 체험으로 시작합니다.",
      cta: "체험 시작",
      ctaHref: "/signup",
      variant: "primary",
    }),
    b("footer", {
      columns: [
        {
          title: "Product",
          links: [
            { label: "Features", href: "/product" },
            { label: "Pricing", href: "/pricing" },
          ],
        },
        {
          title: "Company",
          links: [
            { label: "About", href: "/about" },
            { label: "Careers", href: "/careers" },
          ],
        },
        {
          title: "Legal",
          links: [
            { label: "Privacy", href: "/privacy" },
            { label: "Terms", href: "/terms" },
          ],
        },
      ],
      copyright: "© 2026 Janggu, Inc.",
    }),
  ]);

  // Order board (main)
  appendBlocks(state, deps, orderBoardId, "app", [
    b("page-header", {
      title: "Order board",
      subtitle: "오늘 73건 · 신규 4 · 조리 중 6",
      breadcrumbs: [
        { label: "Janggu", href: "/" },
        { label: "주문", href: "/orders" },
      ],
      actions: [
        { label: "정산 보기", variant: "secondary", href: "/settlement" },
        { label: "새로고침", variant: "primary", href: "" },
      ],
    }),
    b("sidebar", {
      items: [
        { label: "주문", href: "/orders", icon: "list" },
        { label: "메뉴", href: "/menu", icon: "menu" },
        { label: "정산", href: "/settlement", icon: "yen" },
        { label: "직원", href: "/staff", icon: "users" },
        { label: "리뷰", href: "/reviews", icon: "star" },
        { label: "통계", href: "/analytics", icon: "chart" },
        { label: "알림", href: "/alerts", icon: "bell" },
        { label: "설정", href: "/settings", icon: "cog" },
      ],
    }),
    b("banner", {
      variant: "warn",
      text: "쿠팡이츠 API 응답 지연 (평균 2.4s) — 자동 수락은 일시 중지했어요.",
      dismissible: true,
      ctaLabel: "상세",
    }),
    b("tabs", {
      tabs: [
        { label: "신규", id: "new" },
        { label: "조리 중", id: "preparing" },
        { label: "배차", id: "dispatched" },
        { label: "완료", id: "done" },
      ],
      defaultTabId: "new",
    }),
    b("table", {
      columns: ["주문번호", "플랫폼", "메뉴", "금액", "경과", "상태"],
      rows: [
        [
          "BM-7723",
          "배민",
          "후라이드 반마리 외 1",
          "23,800원",
          "00:42",
          "신규",
        ],
        ["CE-1129", "쿠팡이츠", "양념 한마리", "21,000원", "01:15", "신규"],
        ["YG-3304", "요기요", "치즈볼 6개", "5,500원", "02:03", "신규"],
        ["BM-7724", "배민", "간장 반마리 외 2", "27,400원", "03:21", "조리 중"],
        ["BM-7725", "배민", "후라이드 한마리", "19,900원", "05:50", "조리 중"],
      ],
    }),
    b("button", {
      label: "선택 일괄 수락",
      variant: "primary",
      size: "md",
      action: { kind: "none" },
      icon: "check",
      disabled: false,
    }),
    b("button", {
      label: "재배차 요청",
      variant: "secondary",
      size: "md",
      action: { kind: "none" },
      icon: "refresh",
      disabled: false,
    }),
    b("button", {
      label: "환불",
      variant: "destructive",
      size: "md",
      action: { kind: "none" },
      icon: "x",
      disabled: false,
    }),
  ]);

  // Menu manager
  const menu = addScreen(state, deps, "Menu manager", "/menu");
  appendBlocks(state, deps, menu.id, "app", [
    b("page-header", {
      title: "Menu",
      subtitle: "1 source-of-truth · 3 platforms in sync",
      breadcrumbs: [
        { label: "Janggu", href: "/" },
        { label: "메뉴", href: "/menu" },
      ],
      actions: [{ label: "변경 푸시", variant: "primary", href: "" }],
    }),
    b("sidebar", {
      items: [
        { label: "주문", href: "/orders", icon: "list" },
        { label: "메뉴", href: "/menu", icon: "menu" },
        { label: "정산", href: "/settlement", icon: "yen" },
        { label: "설정", href: "/settings", icon: "cog" },
      ],
    }),
    b("tabs", {
      tabs: [
        { label: "메뉴", id: "items" },
        { label: "옵션", id: "options" },
        { label: "품절", id: "soldout" },
      ],
      defaultTabId: "items",
    }),
    b("card-grid", {
      columns: 3,
      cards: [
        {
          title: "후라이드 반마리",
          desc: "11,900원 · 재고 ok · 3 플랫폼 동일",
        },
        {
          title: "양념 한마리",
          desc: "21,000원 · 재고 ok · 배민 가격 19,000 (drift)",
        },
        { title: "치즈볼 6개", desc: "5,500원 · 품절" },
        { title: "간장 한마리", desc: "20,500원 · 재고 ok" },
        { title: "치킨무 (옵션)", desc: "+0원 · 항상 포함" },
        { title: "콜라 1.25L", desc: "+3,500원 · 재고 12" },
      ],
    }),
    b("form", {
      fields: [
        { label: "메뉴명", type: "text", required: true },
        { label: "가격 (원)", type: "number", required: true },
        { label: "설명", type: "textarea", required: false },
        { label: "사진", type: "file", required: false },
      ],
    }),
    b("button", {
      label: "저장 후 푸시",
      variant: "primary",
      size: "md",
      action: { kind: "none" },
      icon: "save",
      disabled: false,
    }),
  ]);

  // Settings
  const settings = addScreen(state, deps, "Settings", "/settings");
  appendBlocks(state, deps, settings.id, "app", [
    b("page-header", {
      title: "Settings",
      subtitle: "매장 · 정산 · 직원 · 알림",
      breadcrumbs: [
        { label: "Janggu", href: "/" },
        { label: "설정", href: "/settings" },
      ],
      actions: [],
    }),
    b("tabs", {
      tabs: [
        { label: "매장", id: "store" },
        { label: "정산", id: "settle" },
        { label: "직원", id: "staff" },
        { label: "알림", id: "notify" },
      ],
      defaultTabId: "store",
    }),
    b("form", {
      fields: [
        { label: "매장명", type: "text", required: true },
        { label: "사업자등록번호", type: "text", required: true },
        { label: "주소", type: "text", required: true },
        { label: "영업 시간", type: "text", required: true },
        { label: "Quiet hours 시작", type: "time", required: false },
        { label: "Quiet hours 종료", type: "time", required: false },
        { label: "자동 수락 한도 (원)", type: "number", required: false },
        { label: "환불 승인 한도 (원)", type: "number", required: false },
      ],
    }),
    b("divider", { orientation: "horizontal", spacing: "md" }),
    b("button", {
      label: "저장",
      variant: "primary",
      size: "md",
      action: { kind: "none" },
      icon: "",
      disabled: false,
    }),
    b("button", {
      label: "취소",
      variant: "ghost",
      size: "md",
      action: { kind: "none" },
      icon: "",
      disabled: false,
    }),
  ]);

  // Settlement
  const settlement = addScreen(state, deps, "Settlement", "/settlement");
  appendBlocks(state, deps, settlement.id, "app", [
    b("page-header", {
      title: "정산",
      subtitle: "지난주 9 min · 자동 reconcile 활성",
      breadcrumbs: [
        { label: "Janggu", href: "/" },
        { label: "정산", href: "/settlement" },
      ],
      actions: [
        { label: "CSV 내보내기", variant: "secondary", href: "" },
        { label: "재계산", variant: "primary", href: "" },
      ],
    }),
    b("sidebar", {
      items: [
        { label: "주문", href: "/orders", icon: "list" },
        { label: "메뉴", href: "/menu", icon: "menu" },
        { label: "정산", href: "/settlement", icon: "yen" },
        { label: "통계", href: "/analytics", icon: "chart" },
        { label: "설정", href: "/settings", icon: "cog" },
      ],
    }),
    b("tabs", {
      tabs: [
        { label: "이번 주", id: "current" },
        { label: "지난 주", id: "last" },
        { label: "이번 달", id: "month" },
      ],
      defaultTabId: "last",
    }),
    b("stat", {
      label: "GMV",
      value: "5,240,300원",
      change: "+8%",
      changeKind: "up",
    }),
    b("stat", {
      label: "수수료",
      value: "698,841원",
      change: "13.3%",
      changeKind: "none",
    }),
    b("stat", {
      label: "환불",
      value: "41,900원",
      change: "0.8%",
      changeKind: "none",
    }),
    b("stat", {
      label: "Net 입금",
      value: "4,499,559원",
      change: "+9%",
      changeKind: "up",
    }),
    b("table", {
      columns: ["플랫폼", "GMV", "수수료", "환불", "Net", "Diff"],
      rows: [
        ["배민", "2,884,000", "356,341", "21,000", "2,506,659", "0"],
        ["쿠팡이츠", "1,512,300", "198,000", "12,500", "1,301,800", "0"],
        ["요기요", "844,000", "144,500", "8,400", "691,100", "+800"],
      ],
    }),
    b("banner", {
      variant: "warn",
      text: "요기요 정산서에서 800원 차이가 발견됐어요. ops에 자동 escalate 됐어요.",
      dismissible: true,
      ctaLabel: "상세",
    }),
  ]);

  // Analytics
  const analytics = addScreen(state, deps, "Analytics", "/analytics");
  appendBlocks(state, deps, analytics.id, "app", [
    b("page-header", {
      title: "통계",
      subtitle: "지난 28일",
      breadcrumbs: [
        { label: "Janggu", href: "/" },
        { label: "통계", href: "/analytics" },
      ],
      actions: [{ label: "날짜 변경", variant: "secondary", href: "" }],
    }),
    b("tabs", {
      tabs: [
        { label: "주문", id: "orders" },
        { label: "매출", id: "revenue" },
        { label: "메뉴", id: "menu" },
        { label: "리뷰", id: "reviews" },
      ],
      defaultTabId: "orders",
    }),
    b("stat", {
      label: "주문 건수",
      value: "2,041",
      change: "+12%",
      changeKind: "up",
    }),
    b("stat", {
      label: "AOV",
      value: "21,800원",
      change: "-2%",
      changeKind: "down",
    }),
    b("stat", {
      label: "재주문율",
      value: "38%",
      change: "+5pt",
      changeKind: "up",
    }),
    b("card-grid", {
      columns: 3,
      cards: [
        { title: "Top 메뉴", desc: "후라이드 반마리 (412건)" },
        { title: "Peak hour", desc: "19:00–20:00 (+38% vs avg)" },
        { title: "Drop-off day", desc: "월요일" },
        { title: "리뷰 평균", desc: "4.6 / 5 (412개)" },
        { title: "취소율", desc: "1.9%" },
        { title: "Cancel reason 1위", desc: "재고 소진 (52%)" },
      ],
    }),
    b("button", {
      label: "리포트 다운로드",
      variant: "secondary",
      size: "md",
      action: { kind: "none" },
      icon: "download",
      disabled: false,
    }),
  ]);

  // Login
  const login = addScreen(state, deps, "Login", "/login");
  appendBlocks(state, deps, login.id, "app", [
    b("page-header", {
      title: "로그인",
      subtitle: "",
      breadcrumbs: [],
      actions: [],
    }),
    b("hero", { title: "Janggu", subtitle: "한 화면, 모든 플랫폼.", cta: "" }),
    b("form", {
      fields: [
        { label: "이메일", type: "email", required: true },
        { label: "비밀번호", type: "password", required: true },
      ],
    }),
    b("button", {
      label: "로그인",
      variant: "primary",
      size: "lg",
      action: { kind: "screen", screenId: orderBoardId },
      icon: "",
      disabled: false,
    }),
    b("divider", { orientation: "horizontal", spacing: "md" }),
    b("button", {
      label: "이메일 매직 링크",
      variant: "secondary",
      size: "md",
      action: { kind: "none" },
      icon: "mail",
      disabled: false,
    }),
    b("button", {
      label: "회원가입",
      variant: "ghost",
      size: "md",
      action: { kind: "url", href: "/signup" },
      icon: "",
      disabled: false,
    }),
  ]);

  addScreenEdge(state, deps, landing.id, login.id, "로그인");
  addScreenEdge(state, deps, login.id, orderBoardId, "성공");
  addScreenEdge(state, deps, orderBoardId, menu.id, "메뉴 관리");
  addScreenEdge(state, deps, orderBoardId, settings.id, "설정");
  addScreenEdge(state, deps, orderBoardId, settlement.id, "정산 보기");
  addScreenEdge(state, deps, orderBoardId, analytics.id, "통계");

  // Use Order board as the active screen
  state.currentScreenId = orderBoardId;
  void findSectionByKind; // mark as used (avoid unused warning when not invoked elsewhere)
}
