import type { AppState } from "@/builder/types/state";
import {
  addScreen,
  addScreenEdge,
  appendBlocks,
  b,
  fillSection,
  type SeedDeps,
} from "./helpers";

// ─────────────────────────────────────────────────────────────────────────────
// demo-mobile — "Jukku" (죽구)
// 작심삼일 안 되게 친구와 페어링하는 습관 트래커. B2C iOS/Android.
// "죽구" = "죽이 잘 맞는 구성원" 줄임말이라는 컨셉으로 가벼운 사회적 압력을
// 통한 습관 유지를 강조.
// ─────────────────────────────────────────────────────────────────────────────

export function populateMobileSeed(state: AppState, deps: SeedDeps): void {
  fillSection(state, deps, "overview", [
    b("heading", {
      level: 1,
      text: "Jukku (죽구) — Habits stick when a friend is watching",
    }),
    b("paragraph", {
      markdown:
        "Jukku pairs you with one friend for a 21-day habit cycle. Daily check-ins are visible to your pair. The product idea is small on purpose: most habit apps fail because they try to be a journal, a calendar, and a coach. Jukku does one thing — accountability via one bond — and stays out of the way.",
    }),
    b("paragraph", {
      markdown:
        "**Why one pair, not a group.** Group accountability dilutes; nobody owes anyone in a group of 8. With one named pair, ghosting feels personal — the social cost matches the behavioral lift.",
    }),
    b("callout", {
      variant: "info",
      title: "Stage",
      text: "Closed TestFlight (iOS) with 412 beta users. Android beta opens 2026 Q3.",
    }),
    b("stat", {
      label: "21-day completion rate",
      value: "47%",
      change: "+9pt vs solo apps",
      changeKind: "up",
    }),
    b("stat", {
      label: "Day-7 retention",
      value: "62%",
      change: "+18pt",
      changeKind: "up",
    }),
    b("stat", {
      label: "Avg pair messages/day",
      value: "3.4",
      change: "",
      changeKind: "none",
    }),
    b("checklist", {
      items: [
        { text: "TestFlight beta close (M0)", checked: true },
        { text: "Pairing graph + invite flow (M1)", checked: true },
        {
          text: "Streak resilience (sick day, travel mode) (M2)",
          checked: true,
        },
        { text: "Android parity (M3)", checked: false },
        { text: "Notification cadence ML model (M4)", checked: false },
        { text: "Public launch (M5)", checked: false },
      ],
    }),
    b("rule"),
    b("paragraph", {
      markdown:
        "**Non-goals.** No calorie tracking. No sleep tracking. No 50-friend leaderboard. No AI coach.",
    }),
  ]);

  fillSection(state, deps, "personas", [
    b("heading", { level: 2, text: "Who Jukku is for" }),
    b("persona", {
      name: "직장인 이서연",
      role: "Marketing manager, 4-yr habit-app churner",
      demographics: "29세, Seoul, owns a Galaxy S23, uses 3 wellness apps/year",
      goals: [
        "Drink 2L of water on weekdays",
        "Stop using a habit app within 4 days of installing it",
        "Have something light to talk about with her best friend daily",
      ],
      needs: [
        "Friction-free check-in (1 tap)",
        "A real person who notices when she skips",
        "Streak that survives one sick day",
      ],
      pains: [
        "Existing habit apps feel like a chore by day 3",
        "Group challenge apps make her self-conscious",
        "Notification fatigue — she has notifications muted from 3 apps",
      ],
      quote: "혼자 하면 사흘이면 까먹어요. 친구가 봐주면 좀 다르더라고요.",
    }),
    b("persona", {
      name: "Pair partner 박지호",
      role: "Best friend, lives 2 시간 away",
      demographics: "30세, Daejeon, software engineer",
      goals: [
        "Stay in light daily contact with 서연",
        "Build his own meditation habit",
        "Not feel guilt-tripped if he skips a day",
      ],
      needs: [
        "Mutual streak rather than 1-way watching",
        "Quick reactions (emoji) that don't require typing",
        "Pause feature for travel without breaking streak",
      ],
      pains: [
        "Apps that turn friendship into surveillance",
        "Forgetting whose turn it is to send what",
      ],
      quote: "강요받는 느낌은 싫고, 그냥 옆에 있는 느낌이면 좋아요.",
    }),
    b("persona", {
      name: "PM 김유진",
      role: "Jukku internal — runs growth + retention",
      demographics: "33세, ex-Toss product team",
      goals: [
        "Lift day-21 completion above 50%",
        "Get pair invite-acceptance rate to 70%+",
        "Keep the app under 25MB on Android",
      ],
      needs: [
        "Cohort analytics tied to pair quality, not just install",
        "A/B harness for notification cadence",
        "Pair-graph view to spot abusive patterns",
      ],
      pains: [
        "Most habit-app analytics tools assume single-user",
        "Pair invites that go to dormant Apple IDs",
      ],
      quote:
        "지표를 페어 단위로 보지 못하면 우리는 그냥 또 하나의 습관 앱이에요.",
    }),
    b("rule"),
    b("user-story", {
      as: "a new user",
      want: "to check in on today's habit in under 3 seconds from app open",
      soThat: "checking in feels lighter than skipping",
      acceptance: [
        "Cold start to Today screen ≤ 1.5s on iPhone 13",
        "Today's habit row reaches finger without scroll",
        "Tap-and-hold confirms with haptic",
      ],
      priority: "P0",
      estimate: "3 pts",
    }),
    b("user-story", {
      as: "a paired user",
      want: "to see when my pair last checked in without opening their profile",
      soThat: "I have a peripheral sense of how they're doing",
      acceptance: [
        "Today screen shows pair's last check-in time as a chip",
        "Chip is privacy-respecting (no exact timestamp; bucketed)",
        "Tapping chip opens their week view",
      ],
      priority: "P1",
      estimate: "2 pts",
    }),
  ]);

  fillSection(state, deps, "glossary", [
    b("heading", { level: 2, text: "Glossary" }),
    b("definition", {
      term: "Pair",
      definition:
        "A bond of exactly two users committed to one shared 21-day cycle. Cannot be expanded or replaced mid-cycle.",
    }),
    b("definition", {
      term: "Streak",
      definition:
        "Consecutive days both pair members checked in. Resets to 0 on a missed day unless a Sick day or Travel mode is active.",
    }),
    b("definition", {
      term: "Sick day",
      definition:
        "Once-per-cycle pause that preserves streak. Must be declared before midnight KST.",
    }),
    b("definition", {
      term: "Travel mode",
      definition:
        "3-day pause activated when time zone differs from home for >24h. Does not break streak but pauses notifications.",
    }),
    b("definition", {
      term: "Check-in",
      definition:
        "Single-tap confirmation that today's habit happened. Has 4 result kinds: done, partial, skipped, sick.",
    }),
    b("definition", {
      term: "Cycle",
      definition:
        "21-day commitment period. After completion, pair can renew, branch (different habits), or part.",
    }),
    b("definition", {
      term: "Pair invite",
      definition:
        "Time-limited URL or KakaoTalk message that turns into an active pair when accepted by one specific user.",
    }),
    b("definition", {
      term: "Quiet hours",
      definition:
        "Default 22:00–08:00 KST window where the app suppresses pair notifications.",
    }),
  ]);

  fillSection(state, deps, "policy-general", [
    b("heading", { level: 3, text: "General handling" }),
    b("paragraph", {
      markdown:
        "Jukku's defaults aim to keep the app gentle. Hard rules below are uniform; pair-level overrides are not allowed in v1.",
    }),
    b("checklist", {
      items: [
        {
          text: "Daily reminder fires once per day at user-configured time",
          checked: true,
        },
        {
          text: "Pair-action notification fires within 60s of partner check-in",
          checked: true,
        },
        {
          text: "Streak math runs at midnight KST (or device local TZ if travel mode)",
          checked: true,
        },
        {
          text: "Habit text is editable for first 24h of cycle, locked after",
          checked: true,
        },
      ],
    }),
    b("callout", {
      variant: "info",
      title: "Why locking habit text",
      text: "Mid-cycle habit redefinition is the #1 way users self-deceive. Locking after 24h is the cheapest pre-commitment device we found.",
    }),
  ]);

  fillSection(state, deps, "policy-special", [
    b("heading", { level: 3, text: "Special situations" }),
    b("callout", {
      variant: "warn",
      title: "Pair ghosting",
      text: "If a pair partner has not checked in for 3 days and ignored 2 nudges, the active user can request a 'pair reset' that ends the current cycle without penalty.",
    }),
    b("callout", {
      variant: "error",
      title: "Abuse / harassment",
      text: "Block + report flow is reachable from any pair-context surface. Reported pairs are dissolved within 1 hour by an on-call moderator.",
    }),
    b("callout", {
      variant: "success",
      title: "Cycle completion",
      text: "Both members get a low-key celebration screen and a choice: renew, branch, or part. We do not gamify with points.",
    }),
  ]);

  fillSection(state, deps, "policy-writing", [
    b("heading", { level: 3, text: "Writing & tone" }),
    b("paragraph", {
      markdown:
        "Jukku's voice is a quiet friend. Not a coach, not a cheerleader. Default language is Korean; English copy follows the same temperature.",
    }),
    b("table", {
      columns: ["When", "Korean voice", "Don't"],
      rows: [
        ["Daily reminder", "오늘도 한 번?", "오늘의 도전을 시작하세요!"],
        [
          "Pair check-in",
          "지호님, 방금 체크인했어요.",
          "🎉🎉 지호님이 또 해냈어요! 🎉",
        ],
        ["Sick day", "오늘은 푹 쉬어요.", "Don't break your streak now!"],
        [
          "Cycle complete",
          "21일을 같이 했네요.",
          "축하합니다! 골드 등급 획득!",
        ],
      ],
    }),
  ]);

  fillSection(state, deps, "policy-error", [
    b("heading", { level: 3, text: "Error messages" }),
    b("table", {
      columns: ["Code", "User-facing message", "Recovery"],
      rows: [
        [
          "NET-001",
          "잠깐 연결이 끊겼어요. 체크인은 저장해뒀어요.",
          "Replay queued check-in on reconnect",
        ],
        ["PAIR-101", "초대 링크가 만료됐어요.", "Owner regenerates link"],
        [
          "PAIR-102",
          "이미 다른 페어와 사이클 중이에요.",
          "End current cycle first",
        ],
        ["SYNC-201", "친구의 체크인이 아직 안 보여요.", "Pull-to-refresh"],
        [
          "TZ-301",
          "시간대가 바뀐 것 같아요. 여행 모드로 켤까요?",
          "Tap to enable travel mode",
        ],
      ],
    }),
  ]);

  fillSection(state, deps, "business", [
    b("heading", { level: 2, text: "Business plan" }),
    b("paragraph", {
      markdown:
        "Free with optional one-time purchase for advanced themes and statistics ($4.99). Subscription is intentionally avoided — habit apps with monthly subs have notoriously bad LTV.",
    }),
    b("table", {
      columns: ["Tier", "Price", "What's in"],
      rows: [
        ["Free", "0원", "Pair, 21-day cycle, basic streaks"],
        ["Companion", "₩6,900 once", "Themes, year-view, CSV export"],
        [
          "Pair Plus",
          "₩12,900 once / pair",
          "Both members get Companion features",
        ],
      ],
    }),
    b("numbered-list", {
      ordered: true,
      items: [
        "Acquisition: KakaoTalk pair invite is the primary loop. Invitee install rate is the leading metric.",
        "Activation: Day-3 retention; correlates with day-21 completion at 0.71.",
        "Retention: Pair quality (mutual check-in symmetry) > content depth.",
        "Monetization: Companion purchase is offered after first cycle completion only.",
      ],
    }),
    b("metric", {
      name: "Pair invite acceptance",
      target: "70%",
      current: "58%",
      status: "warn",
      unit: "%",
      trend: "up",
    }),
    b("metric", {
      name: "ARPU (lifetime)",
      target: "$1.20",
      current: "$0.74",
      status: "bad",
      unit: "$",
      trend: "up",
    }),
    b("metric", {
      name: "Day-21 completion",
      target: "55%",
      current: "47%",
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
        "Install → onboarding (3 screens, ~45s).",
        "Pair invite (KakaoTalk default, fallback URL).",
        "First cycle starts at next 00:00 KST after both accept.",
        "Day-3 / day-7 / day-14 in-app touchpoints (no email).",
        "Cycle close → renew/branch/part screen.",
        "Lapsed users get one re-engagement at day-3 of inactivity, then silence.",
      ],
    }),
    b("checklist", {
      items: [
        { text: "Crash-free sessions ≥ 99.6%", checked: true },
        { text: "Push delivery ≥ 99% (FCM/APNs)", checked: true },
        { text: "Moderation SLA ≤ 1 hour", checked: true },
        { text: "Weekly cohort review every Mon", checked: true },
      ],
    }),
    b("decision", {
      question: "Use system Sign in with Apple or our own account system?",
      status: "accepted",
      context:
        "We want minimum onboarding friction but also need stable account identity for pair graph integrity.",
      options: [
        {
          label: "Apple/Google only",
          pros: "Zero password, fast",
          cons: "Locked to platform stores; no email recovery",
        },
        {
          label: "Email + magic link",
          pros: "Portable",
          cons: "Friction in onboarding",
        },
        {
          label: "Apple/Google + optional email link",
          pros: "Best of both",
          cons: "Slightly more code; merge edge cases",
        },
      ],
      decision:
        "Apple/Google primary, optional email link for recovery — option 3.",
      rationale:
        "Most users will never touch the email path; it exists as escape hatch.",
      consequences:
        "Email merge logic must handle Apple's hide-my-email aliases — covered by ADR-002.",
    }),
  ]);

  fillSection(state, deps, "platform", [
    b("heading", { level: 2, text: "Platform spec (iOS / Android)" }),
    b("table", {
      columns: ["Concern", "iOS", "Android"],
      rows: [
        ["Min OS", "iOS 16", "Android 10 (API 29)"],
        ["Target", "iOS 18 / 26", "Android 14 (API 34)"],
        ["Smallest device", "iPhone SE 2", "Galaxy A14"],
        ["UI framework", "SwiftUI 5", "Jetpack Compose 1.7"],
        ["Notifications", "APNs", "FCM"],
        ["Local storage", "Core Data", "Room"],
      ],
    }),
    b("paragraph", {
      markdown:
        "Single React Native shell was rejected — the haptics, lock-screen widget, and accessibility experience we want are easier in native.",
    }),
    b("decision", {
      question: "React Native or native?",
      status: "accepted",
      context: "Two-engineer team has to ship on both platforms.",
      options: [
        {
          label: "React Native",
          pros: "1 codebase, faster v1",
          cons: "Worse haptics, widget UX, a11y",
        },
        {
          label: "Native (Swift + Kotlin)",
          pros: "Best UX per platform",
          cons: "Two codebases",
        },
        {
          label: "Native + shared core (KMP)",
          pros: "Sharing without RN compromises",
          cons: "Toolchain immaturity",
        },
      ],
      decision: "Native, no shared core in v1.",
      rationale: "Surface area is small; UX-sensitive moments are the product.",
      consequences: "Slight feature lag on Android until 2026 Q3.",
    }),
  ]);

  fillSection(state, deps, "native-modules", [
    b("heading", { level: 2, text: "Native modules & permissions" }),
    b("bullet-list", {
      ordered: false,
      items: [
        {
          text: "Notifications (APNs/FCM) — required at install for pair sync.",
        },
        { text: "Contacts — optional, only used for pair invite suggestions." },
        { text: "Local timezone — read-only, drives travel mode trigger." },
        { text: "Haptics — used on check-in confirm; no permission required." },
        {
          text: "Live Activities (iOS) — opt-in, shows current streak on lock screen.",
        },
        { text: "App Widgets (Android/iOS) — opt-in." },
      ],
    }),
    b("table", {
      columns: [
        "Permission",
        "iOS prompt timing",
        "Android prompt timing",
        "Fallback",
      ],
      rows: [
        [
          "Notifications",
          "After first pair invite",
          "After first pair invite",
          "Pair sync via in-app refresh",
        ],
        [
          "Contacts",
          "Manually opt-in via invite screen",
          "Manual opt-in",
          "Manual link share",
        ],
        [
          "Time zone change",
          "n/a (read system)",
          "n/a (read system)",
          "Manual travel toggle",
        ],
      ],
    }),
    b("code-block", {
      language: "swift",
      filename: "PairInviteIntent.swift",
      code: 'struct PairInviteIntent: AppIntent {\n  static var title: LocalizedStringResource = "Send pair invite"\n  @Parameter(title: "Friend name") var name: String\n  func perform() async throws -> some IntentResult {\n    let token = try await PairAPI.createInvite()\n    let url = URL(string: "https://jukku.app/i/\\(token)")!\n    return .result(value: url.absoluteString)\n  }\n}',
    }),
  ]);

  fillSection(state, deps, "data", [
    b("heading", { level: 2, text: "Data model" }),
    b("paragraph", {
      markdown:
        "Server-side: Postgres. Client-side: minimal local state, server is source-of-truth. Data is per-user; pair is a join table.",
    }),
    b("code-block", {
      language: "sql",
      filename: "schema.sql",
      code: "create table user_account (\n  id uuid primary key,\n  apple_sub text,\n  google_sub text,\n  email text,\n  display_name text not null,\n  created_at timestamptz default now()\n);\n\ncreate table pair (\n  id uuid primary key,\n  user_a uuid not null references user_account(id),\n  user_b uuid not null references user_account(id),\n  cycle_started_on date not null,\n  status text not null check (status in ('pending','active','complete','dissolved'))\n);\n\ncreate table check_in (\n  id uuid primary key,\n  pair_id uuid not null references pair(id),\n  user_id uuid not null references user_account(id),\n  on_date date not null,\n  result text not null check (result in ('done','partial','skipped','sick')),\n  unique (pair_id, user_id, on_date)\n);",
    }),
    b("table", {
      columns: ["Entity", "Purpose"],
      rows: [
        ["user_account", "Single user identity"],
        ["pair", "Bond of two users for one cycle"],
        ["check_in", "Daily result per user per pair"],
        ["nudge_event", "When/how a nudge was sent and whether it landed"],
      ],
    }),
  ]);

  fillSection(state, deps, "risks", [
    b("heading", { level: 2, text: "Risks & assumptions" }),
    b("risk", {
      risk: "Pair invite gets stuck in KakaoTalk preview cache",
      impact: "Drop in invite acceptance",
      impactLevel: "medium",
      likelihood: "high",
      mitigation: "Universal links + a recover-by-code screen as fallback",
      owner: "유진 (PM)",
    }),
    b("risk", {
      risk: "Pair-based abuse (one user pressuring another)",
      impact: "Brand damage, regulatory attention",
      impactLevel: "high",
      likelihood: "low",
      mitigation:
        "Block/report flow on every pair surface; mandatory cooldown after report",
      owner: "유진 (PM)",
    }),
    b("risk", {
      risk: "iOS Live Activity rejection at App Review",
      impact: "Feature delay",
      impactLevel: "medium",
      likelihood: "medium",
      mitigation:
        "Pre-flight with App Store technical contact; feature flag in case of rejection",
      owner: "민준 (iOS lead)",
    }),
    b("risk", {
      risk: "Android FCM token churn during OS update",
      impact: "Notifications drop silently",
      impactLevel: "medium",
      likelihood: "medium",
      mitigation: "Token refresh job + canary check-ins from server",
      owner: "수빈 (Android lead)",
    }),
  ]);

  fillSection(state, deps, "metrics", [
    b("heading", { level: 2, text: "Metrics & KPIs" }),
    b("metric", {
      name: "Day-21 completion",
      target: "55%",
      current: "47%",
      status: "warn",
      unit: "%",
      trend: "up",
    }),
    b("metric", {
      name: "Pair invite acceptance",
      target: "70%",
      current: "58%",
      status: "warn",
      unit: "%",
      trend: "up",
    }),
    b("metric", {
      name: "Crash-free sessions",
      target: "99.6%",
      current: "99.81%",
      status: "ok",
      unit: "%",
      trend: "flat",
    }),
    b("metric", {
      name: "App size (Android)",
      target: "<25 MB",
      current: "22.3 MB",
      status: "ok",
      unit: "MB",
      trend: "flat",
    }),
    b("metric", {
      name: "Time to first check-in",
      target: "<3 min",
      current: "4m 12s",
      status: "warn",
      unit: "",
      trend: "down",
    }),
  ]);

  populateMobileExtras(state, deps);
  populateMobileExtrasTwo(state, deps);
  populateMobileScreens(state, deps);
}

function populateMobileExtrasTwo(state: AppState, deps: SeedDeps): void {
  fillSection(state, deps, "overview", [
    b("paragraph", {
      markdown:
        "**Founding insight.** A 2025 longitudinal study on Korean wellness app users found that 'someone I know notices' was the single strongest predictor of habit retention past day 21 — stronger than streak rewards, points, or coaching tips.",
    }),
    b("callout", {
      variant: "success",
      title: "Beta highlight",
      text: "Pair (서연 ↔ 지호) finished cycle 3 with 92% mutual symmetry, the highest in beta cohort.",
    }),
    b("paragraph", {
      markdown:
        "**Geography.** KR + JP for v1 (similar TZ + cultural fit). EN copy ships day-one but US growth is post-launch.",
    }),
  ]);
  fillSection(state, deps, "personas", [
    b("paragraph", {
      markdown:
        "**Anti-personas.** Self-improvement maximalists, gamification fans, group-challenge users. Jukku will feel under-featured to them — that's intentional.",
    }),
    b("user-story", {
      as: "a returning user",
      want: "to see if my old pair is still active",
      soThat: "I can decide whether to ping them or start fresh",
      acceptance: [
        "Re-open shows last pair status (active / dissolved / inactive)",
        "If active, show last cycle summary",
        "If dissolved, show 'start fresh' CTA",
      ],
      priority: "P2",
      estimate: "3 pts",
    }),
    b("user-story", {
      as: "a user with notification fatigue",
      want: "to set quiet hours from the first reminder I receive",
      soThat: "I don't dismiss the app entirely",
      acceptance: [
        "Inline quiet-hours suggestion on first reminder",
        "Two-tap configure",
        "Stored as user preference",
      ],
      priority: "P1",
      estimate: "2 pts",
    }),
  ]);
  fillSection(state, deps, "policy-general", [
    b("paragraph", {
      markdown:
        "**Data deletion.** Account deletion is one tap from settings. Data is purged within 7 days, including pair history (where the partner sees a 'left Jukku' status).",
    }),
    b("checklist", {
      items: [
        {
          text: "GDPR-style export available even though not legally required in KR",
          checked: true,
        },
        {
          text: "PIPA Article 17 compliance for under-18 accounts",
          checked: true,
        },
        {
          text: "Retention policy posted in plain Korean in Profile → Privacy",
          checked: true,
        },
      ],
    }),
  ]);
  fillSection(state, deps, "platform", [
    b("paragraph", {
      markdown:
        "**Accessibility.** Dynamic Type support; minimum tap target 44pt; VoiceOver/TalkBack on every interactive element.",
    }),
    b("table", {
      columns: ["A11y check", "iOS", "Android"],
      rows: [
        ["Min tap target", "44pt", "48dp"],
        ["Color contrast", "WCAG AA", "WCAG AA"],
        ["Reduced motion respected", "yes", "yes"],
        ["Larger text up to", "AX5", "200%"],
      ],
    }),
  ]);
  fillSection(state, deps, "data", [
    b("bullet-list", {
      ordered: false,
      items: [
        {
          text: "Server: Postgres 16 with pg_partman for nudge_event monthly partitions.",
        },
        { text: "Client: SQLite cache invalidated by server-issued etag." },
        {
          text: "Sync: per-pair LWW with vector clocks for offline check-ins.",
        },
      ],
    }),
    b("paragraph", {
      markdown:
        "**Offline behavior.** Single check-in works offline; pair-relative views require connection. Reconnect replays queued check-ins in order.",
    }),
  ]);
  fillSection(state, deps, "native-modules", [
    b("code-block", {
      language: "kotlin",
      filename: "ShareInvite.kt",
      code: 'fun shareInvite(activity: Activity, token: String) {\n  val url = "https://jukku.app/i/$token"\n  val intent = Intent(Intent.ACTION_SEND).apply {\n    type = "text/plain"\n    putExtra(Intent.EXTRA_TEXT, "같이 21일 어때? $url")\n  }\n  activity.startActivity(Intent.createChooser(intent, "초대 보내기"))\n}',
    }),
  ]);
  fillSection(state, deps, "metrics", [
    b("metric", {
      name: "ANR rate (Android)",
      target: "<0.05%",
      current: "0.03%",
      status: "ok",
      unit: "%",
      trend: "flat",
    }),
    b("metric", {
      name: "Push opt-in",
      target: ">75%",
      current: "68%",
      status: "warn",
      unit: "%",
      trend: "up",
    }),
    b("metric", {
      name: "Avg session length",
      target: "30–90s",
      current: "47s",
      status: "ok",
      unit: "s",
      trend: "flat",
    }),
  ]);
  fillSection(state, deps, "risks", [
    b("risk", {
      risk: "Korean App Review wants disclosure of pair-based emotional pressure",
      impact: "Listing delay or copy mandate",
      impactLevel: "low",
      likelihood: "low",
      mitigation:
        "Pre-flight with KCC; pair language emphasizes mutual support",
      owner: "유진 (PM)",
    }),
    b("risk", {
      risk: "Pair screenshots leak to social media as humblebrag",
      impact: "Privacy backlash",
      impactLevel: "low",
      likelihood: "medium",
      mitigation: "Watermarked screenshots with privacy notice",
      owner: "유진 (PM)",
    }),
    b("risk", {
      risk: "TZ-detection false-positive triggers travel mode at home",
      impact: "Streak math incorrect",
      impactLevel: "low",
      likelihood: "medium",
      mitigation: "Confirm prompt before travel mode auto-enables",
      owner: "수빈 (Android lead)",
    }),
  ]);
  fillSection(state, deps, "glossary", [
    b("definition", {
      term: "Mutual symmetry",
      definition: "Ratio of mutual check-in days to total days in a cycle.",
    }),
    b("definition", {
      term: "Cycle renew",
      definition: "Continue paired with same habits for another 21 days.",
    }),
    b("definition", {
      term: "Cycle branch",
      definition: "Continue paired but each member starts a different habit.",
    }),
    b("definition", {
      term: "Re-pair",
      definition:
        "After a cycle ends, find a new pair partner without new account.",
    }),
    b("definition", {
      term: "Bedtime cutoff override",
      definition:
        "Per-user adjustment to the default 02:00 cutoff for night-owl schedules.",
    }),
  ]);
  fillSection(state, deps, "metrics", [
    b("metric", {
      name: "Pair invite TTL hit rate",
      target: ">90%",
      current: "84%",
      status: "warn",
      unit: "%",
      trend: "up",
    }),
    b("metric", {
      name: "Travel mode false-positive",
      target: "<2%",
      current: "1.1%",
      status: "ok",
      unit: "%",
      trend: "flat",
    }),
    b("metric", {
      name: "Re-pair adoption",
      target: ">30%",
      current: "22%",
      status: "warn",
      unit: "%",
      trend: "up",
    }),
    b("metric", {
      name: "Pair invite open → install",
      target: ">35%",
      current: "29%",
      status: "warn",
      unit: "%",
      trend: "up",
    }),
    b("metric", {
      name: "Companion purchase rate (post-cycle 1)",
      target: ">8%",
      current: "5.2%",
      status: "warn",
      unit: "%",
      trend: "up",
    }),
  ]);
}

function populateMobileExtras(state: AppState, deps: SeedDeps): void {
  fillSection(state, deps, "glossary", [
    b("definition", {
      term: "Branch (cycle)",
      definition:
        "Post-cycle option where each pair member starts a new 21-day cycle with a different habit but stays paired.",
    }),
    b("definition", {
      term: "Part (cycle)",
      definition:
        "Post-cycle option where the pair dissolves amicably. Stats are preserved on each user's profile.",
    }),
    b("definition", {
      term: "Renew",
      definition:
        "Post-cycle option where both members commit to another 21 days with the same habits.",
    }),
    b("definition", {
      term: "Nudge",
      definition:
        "A non-pushy in-app prompt fired when a pair partner skips a day. Contains no guilt language.",
    }),
    b("definition", {
      term: "Pair stat symmetry",
      definition:
        "Ratio of mutual check-ins to total check-ins in a cycle. >0.85 correlates strongly with renewal.",
    }),
    b("definition", {
      term: "Streak shield",
      definition:
        "Premium-only feature that converts up to 3 missed days into Sick days retroactively.",
    }),
    b("definition", {
      term: "Pair invite link",
      definition:
        "https://jukku.app/i/{token} URL with 24h TTL. One-shot consumption.",
    }),
    b("definition", {
      term: "Bedtime cutoff",
      definition:
        "Default 02:00 KST. Check-ins after this count toward the previous day to avoid streak break for night-owl users.",
    }),
  ]);

  fillSection(state, deps, "personas", [
    b("user-story", {
      as: "a user re-installing the app",
      want: "to restore my previous pair without invitation",
      soThat: "I don't lose history",
      acceptance: [
        "Sign-in with same Apple/Google ID restores last-active pair",
        "If pair dissolved while away, show last-cycle summary",
        "Restore completes within 5 seconds offline-tolerant",
      ],
      priority: "P1",
      estimate: "5 pts",
    }),
    b("user-story", {
      as: "a paired user traveling abroad",
      want: "to enable travel mode without breaking my streak",
      soThat: "I can rest without losing momentum",
      acceptance: [
        "Travel mode auto-suggests when device timezone changes by >2h for 24h",
        "User can confirm or dismiss with one tap",
        "Streak math respects travel mode bracket",
      ],
      priority: "P1",
      estimate: "3 pts",
    }),
    b("user-story", {
      as: "a user feeling overwhelmed",
      want: "to declare a sick day without guilt copy",
      soThat: "the app stays gentle",
      acceptance: [
        "Sick day flow has no apology language",
        "Pair sees 'rest day taken' chip, no detail",
        "Confirmation is single-tap, no modal stack",
      ],
      priority: "P0",
      estimate: "2 pts",
    }),
  ]);

  fillSection(state, deps, "ops", [
    b("paragraph", {
      markdown:
        "**Push reliability.** APNs and FCM are best-effort. We monitor delivery rate via canary check-ins from a server-controlled 'shadow user' that mirrors a real user's notification pattern.",
    }),
    b("table", {
      columns: ["Surface", "iOS", "Android"],
      rows: [
        ["Daily reminder", "APNs sound + badge", "FCM high-priority"],
        ["Pair check-in", "APNs silent", "FCM high-priority"],
        ["Quiet hours", "Critical-only", "Quiet category"],
        ["Cycle complete", "APNs full", "FCM full"],
      ],
    }),
    b("decision", {
      question: "Allow third-party login providers beyond Apple/Google?",
      status: "proposed",
      context: "KakaoTalk login is Korean-default. Question: do we add it?",
      options: [
        {
          label: "Add KakaoTalk login",
          pros: "Lower onboarding friction in KR",
          cons: "Extra account-merge edge cases",
        },
        {
          label: "Stay with Apple/Google only",
          pros: "Simpler",
          cons: "Friction for Korean users without Apple/Google primary",
        },
      ],
      decision: "",
      rationale: "Pending design review.",
      consequences:
        "If adopted, account-merge logic must handle KakaoTalk hide-email aliases similar to Apple's.",
    }),
  ]);

  fillSection(state, deps, "platform", [
    b("paragraph", {
      markdown:
        "**Build & release cadence.** iOS ships every other Thursday via TestFlight → manual review → release. Android ships weekly via Play Console internal track → 1% rollout → 100%.",
    }),
    b("table", {
      columns: ["Surface", "iOS technique", "Android technique"],
      rows: [
        ["Streak ring", "SF Symbols + animation", "Compose Canvas"],
        ["Lock-screen widget", "WidgetKit", "AppWidget + Glance"],
        ["Haptic confirm", "UIFeedbackGenerator", "VibrationEffect"],
        [
          "Pair invite share",
          "ShareLink + UniversalLinks",
          "Intent + AppLinks",
        ],
      ],
    }),
    b("bullet-list", {
      ordered: false,
      items: [
        { text: "Crash reporting via Sentry; symbolication uploaded by CI." },
        {
          text: "Performance traces via Sentry on cold start, check-in flow, pair invite.",
        },
        {
          text: "A/B framework: GrowthBook with mobile SDK; sticky bucketing on user_id.",
        },
        { text: "Localization: only KO + EN in v1." },
      ],
    }),
  ]);

  fillSection(state, deps, "data", [
    b("code-block", {
      language: "sql",
      filename: "nudge.sql",
      code: "create table nudge_event (\n  id uuid primary key,\n  pair_id uuid not null,\n  to_user_id uuid not null,\n  trigger text not null check (trigger in ('partner_skip','partner_streak_milestone','reminder_time')),\n  channel text not null check (channel in ('apns','fcm','inapp')),\n  delivered_at timestamptz,\n  opened_at timestamptz,\n  created_at timestamptz default now()\n);\n\ncreate index nudge_pair_at on nudge_event(pair_id, created_at desc);",
    }),
    b("paragraph", {
      markdown:
        "**Privacy.** All pair-visible data is end-user only — no employee can read habit text or messages without a written legal request.",
    }),
  ]);

  fillSection(state, deps, "risks", [
    b("risk", {
      risk: "Apple rejects the app for promoting addictive behavior",
      impact: "Launch delay",
      impactLevel: "medium",
      likelihood: "low",
      mitigation:
        "Pre-flight with App Store technical contact; emphasize accountability framing",
      owner: "민준 (iOS lead)",
    }),
    b("risk", {
      risk: "App size balloons past 25MB after Live Activities",
      impact: "Slower install on flaky networks",
      impactLevel: "low",
      likelihood: "medium",
      mitigation: "Asset audit + on-demand resources for animations",
      owner: "민준 (iOS lead)",
    }),
    b("risk", {
      risk: "Pair partner becomes inactive Apple ID",
      impact: "Streak stuck, partner UX broken",
      impactLevel: "medium",
      likelihood: "medium",
      mitigation:
        "Inactivity heuristic (>14d no app open) prompts the active user to re-pair",
      owner: "유진 (PM)",
    }),
  ]);

  fillSection(state, deps, "metrics", [
    b("metric", {
      name: "Pair stat symmetry",
      target: ">0.85",
      current: "0.71",
      status: "warn",
      unit: "",
      trend: "up",
    }),
    b("metric", {
      name: "Sick day usage / cycle",
      target: "<1.5",
      current: "0.8",
      status: "ok",
      unit: "",
      trend: "flat",
    }),
    b("metric", {
      name: "Day-3 retention",
      target: ">75%",
      current: "68%",
      status: "warn",
      unit: "%",
      trend: "up",
    }),
    b("metric", {
      name: "Streak break recoverability",
      target: ">40%",
      current: "32%",
      status: "warn",
      unit: "%",
      trend: "up",
    }),
  ]);

  fillSection(state, deps, "native-modules", [
    b("paragraph", {
      markdown:
        "**Permissions strategy.** Each permission is requested at the moment of value, not at app start. Notification permission specifically waits until the first pair invite is sent.",
    }),
    b("table", {
      columns: ["Permission", "First-request rate target", "Actual"],
      rows: [
        ["Notifications", "75%", "68%"],
        ["Contacts", "30%", "12%"],
      ],
    }),
  ]);
}

function populateMobileScreens(state: AppState, deps: SeedDeps): void {
  // Reuse default "Main" screen as Today
  const defaultId = state.currentScreenId;
  const todayId = defaultId ?? addScreen(state, deps, "Today", "/today").id;
  if (defaultId && state.screens[defaultId]) {
    state.screens[defaultId].title = "Today";
    state.screens[defaultId].route = "/today";
  }

  // Onboarding
  const onboarding = addScreen(state, deps, "Onboarding", "/onboarding");
  appendBlocks(state, deps, onboarding.id, "app", [
    b("status-bar", { variant: "dark", time: "08:42", batteryPct: 78 }),
    b("hero", {
      title: "혼자 하면 사흘.",
      subtitle: "친구 한 명과 21일.",
      cta: "시작하기",
    }),
    b("form", {
      fields: [
        { label: "닉네임", type: "text", required: true },
        { label: "이번 사이클 습관", type: "text", required: true },
        { label: "친구 페어 코드 (선택)", type: "text", required: false },
      ],
    }),
    b("button", {
      label: "다음",
      variant: "primary",
      size: "lg",
      action: { kind: "screen", screenId: todayId },
      icon: "",
      disabled: false,
    }),
  ]);

  // Today (main)
  appendBlocks(state, deps, todayId, "app", [
    b("status-bar", { variant: "dark", time: "07:14", batteryPct: 92 }),
    b("page-header", {
      title: "오늘의 한 번",
      subtitle: "지호님과 14일째",
      breadcrumbs: [],
      actions: [],
    }),
    b("stat", { label: "연속", value: "14일", change: "+1", changeKind: "up" }),
    b("stat", {
      label: "완료율",
      value: "92%",
      change: "",
      changeKind: "none",
    }),
    b("list-row", {
      title: "물 2L",
      subtitle: "오늘 1.4L · 6잔째",
      leading: "💧",
      trailing: "체크",
      chevron: true,
    }),
    b("list-row", {
      title: "10분 산책",
      subtitle: "어제 완료",
      leading: "🚶",
      trailing: "체크",
      chevron: true,
    }),
    b("list-row", {
      title: "10분 명상",
      subtitle: "지호님 완료",
      leading: "🧘",
      trailing: "체크",
      chevron: true,
    }),
    b("list-row", {
      title: "독서 5쪽",
      subtitle: "건너뛰기 가능",
      leading: "📖",
      trailing: "스킵",
      chevron: true,
    }),
    b("list-row", {
      title: "스트레칭",
      subtitle: "Sick day 사용 가능",
      leading: "🤸",
      trailing: "쉬기",
      chevron: true,
    }),
    b("fab", {
      label: "+",
      icon: "plus",
      position: "br",
      action: { kind: "none" },
    }),
    b("bottom-nav", {
      items: [
        { label: "Today", icon: "home", screenId: todayId },
        { label: "Pair", icon: "users", screenId: "" },
        { label: "Me", icon: "user", screenId: "" },
      ],
      activeIndex: 0,
    }),
  ]);

  // Habit detail
  const detail = addScreen(state, deps, "Habit detail", "/habit/water");
  appendBlocks(state, deps, detail.id, "app", [
    b("status-bar", { variant: "dark", time: "07:18", batteryPct: 92 }),
    b("page-header", {
      title: "물 2L",
      subtitle: "21일 사이클 · 14일째",
      breadcrumbs: [{ label: "Today", href: "/today" }],
      actions: [],
    }),
    b("stat", { label: "연속", value: "14일", change: "+1", changeKind: "up" }),
    b("stat", {
      label: "이번 사이클",
      value: "13/14",
      change: "",
      changeKind: "none",
    }),
    b("stat", {
      label: "지호님",
      value: "12/14",
      change: "",
      changeKind: "none",
    }),
    b("card-grid", {
      columns: 1,
      cards: [
        { title: "월 ✓ 화 ✓ 수 ✓ 목 ✓ 금 ✓ 토 ✓ 일 ✓", desc: "이번 주" },
        {
          title: "월 ✓ 화 ✓ 수 ✓ 목 ✓ 금 ✓ 토 — 일 ✓",
          desc: "지난 주 (sick day 1회)",
        },
      ],
    }),
    b("list-row", {
      title: "오늘",
      subtitle: "1.4L · 6잔째",
      leading: "💧",
      trailing: "+",
      chevron: false,
    }),
    b("list-row", {
      title: "어제",
      subtitle: "2.1L · 8잔째",
      leading: "✓",
      trailing: "",
      chevron: false,
    }),
    b("list-row", {
      title: "그저께",
      subtitle: "2.0L · 8잔째",
      leading: "✓",
      trailing: "",
      chevron: false,
    }),
    b("list-row", {
      title: "3일 전",
      subtitle: "2.4L · 9잔째",
      leading: "✓",
      trailing: "",
      chevron: false,
    }),
    b("list-row", {
      title: "4일 전",
      subtitle: "1.9L · 7잔째",
      leading: "✓",
      trailing: "",
      chevron: false,
    }),
    b("list-row", {
      title: "5일 전",
      subtitle: "Sick day",
      leading: "🌧",
      trailing: "",
      chevron: false,
    }),
    b("list-row", {
      title: "6일 전",
      subtitle: "2.0L · 8잔째",
      leading: "✓",
      trailing: "",
      chevron: false,
    }),
    b("button", {
      label: "체크인",
      variant: "primary",
      size: "lg",
      action: { kind: "none" },
      icon: "check",
      disabled: false,
    }),
    b("bottom-nav", {
      items: [
        { label: "Today", icon: "home", screenId: todayId },
        { label: "Pair", icon: "users", screenId: "" },
        { label: "Me", icon: "user", screenId: "" },
      ],
      activeIndex: 0,
    }),
  ]);

  // Pair
  const pair = addScreen(state, deps, "Pair", "/pair");
  appendBlocks(state, deps, pair.id, "app", [
    b("status-bar", { variant: "dark", time: "07:20", batteryPct: 92 }),
    b("page-header", {
      title: "지호님과",
      subtitle: "14일째 함께",
      breadcrumbs: [],
      actions: [],
    }),
    b("avatar", {
      name: "박지호",
      src: "",
      size: "lg",
      subtitle: "마지막 체크인 · 7시간 전",
    }),
    b("stat", {
      label: "함께한 사이클",
      value: "3",
      change: "",
      changeKind: "none",
    }),
    b("stat", {
      label: "이번 사이클 완료",
      value: "12/14",
      change: "",
      changeKind: "none",
    }),
    b("list-row", {
      title: "오늘 명상 완료",
      subtitle: "07:02",
      leading: "🧘",
      trailing: "",
      chevron: false,
    }),
    b("list-row", {
      title: "어제 산책 완료",
      subtitle: "어제 19:14",
      leading: "🚶",
      trailing: "",
      chevron: false,
    }),
    b("list-row", {
      title: "그저께 sick day 사용",
      subtitle: "그저께 21:50",
      leading: "🌧",
      trailing: "",
      chevron: false,
    }),
    b("list-row", {
      title: "초대 코드 보내기",
      subtitle: "다음 사이클을 위해",
      leading: "✉️",
      trailing: "",
      chevron: true,
    }),
    b("bottom-nav", {
      items: [
        { label: "Today", icon: "home", screenId: todayId },
        { label: "Pair", icon: "users", screenId: pair.id },
        { label: "Me", icon: "user", screenId: "" },
      ],
      activeIndex: 1,
    }),
  ]);

  // Profile
  const profile = addScreen(state, deps, "Profile", "/me");
  appendBlocks(state, deps, profile.id, "app", [
    b("status-bar", { variant: "dark", time: "07:21", batteryPct: 92 }),
    b("page-header", {
      title: "내 정보",
      subtitle: "이서연",
      breadcrumbs: [],
      actions: [],
    }),
    b("avatar", { name: "이서연", src: "", size: "lg", subtitle: "@seoyeon" }),
    b("list-row", {
      title: "알림 시간",
      subtitle: "오전 7시",
      leading: "🔔",
      trailing: "변경",
      chevron: true,
    }),
    b("list-row", {
      title: "Quiet hours",
      subtitle: "22:00–08:00",
      leading: "🌙",
      trailing: "변경",
      chevron: true,
    }),
    b("list-row", {
      title: "여행 모드",
      subtitle: "꺼짐",
      leading: "✈️",
      trailing: "켜기",
      chevron: true,
    }),
    b("list-row", {
      title: "Companion 잠금 해제",
      subtitle: "₩6,900 once",
      leading: "🎁",
      trailing: "구매",
      chevron: true,
    }),
    b("list-row", {
      title: "데이터 내보내기",
      subtitle: "CSV",
      leading: "📤",
      trailing: "",
      chevron: true,
    }),
    b("list-row", {
      title: "계정 로그아웃",
      subtitle: "",
      leading: "🚪",
      trailing: "",
      chevron: true,
    }),
    b("button", {
      label: "도움말",
      variant: "ghost",
      size: "md",
      action: { kind: "url", href: "https://help.jukku.app" },
      icon: "",
      disabled: false,
    }),
    b("bottom-nav", {
      items: [
        { label: "Today", icon: "home", screenId: todayId },
        { label: "Pair", icon: "users", screenId: pair.id },
        { label: "Me", icon: "user", screenId: profile.id },
      ],
      activeIndex: 2,
    }),
  ]);

  // Pair invite
  const invite = addScreen(state, deps, "Pair invite", "/pair/invite");
  appendBlocks(state, deps, invite.id, "app", [
    b("status-bar", { variant: "dark", time: "08:00", batteryPct: 88 }),
    b("page-header", {
      title: "친구 한 명만 골라요",
      subtitle: "21일을 같이 할 페어",
      breadcrumbs: [],
      actions: [],
    }),
    b("hero", {
      title: "Pair 만들기",
      subtitle: "초대 링크는 24시간 유효해요.",
      cta: "",
    }),
    b("list-row", {
      title: "박지호",
      subtitle: "최근 연락 · 어제",
      leading: "👤",
      trailing: "초대",
      chevron: true,
    }),
    b("list-row", {
      title: "김민서",
      subtitle: "최근 연락 · 3일 전",
      leading: "👤",
      trailing: "초대",
      chevron: true,
    }),
    b("list-row", {
      title: "이수아",
      subtitle: "최근 연락 · 일주일 전",
      leading: "👤",
      trailing: "초대",
      chevron: true,
    }),
    b("button", {
      label: "링크 복사",
      variant: "secondary",
      size: "md",
      action: { kind: "none" },
      icon: "copy",
      disabled: false,
    }),
    b("button", {
      label: "KakaoTalk으로 보내기",
      variant: "primary",
      size: "lg",
      action: { kind: "none" },
      icon: "send",
      disabled: false,
    }),
    b("bottom-nav", {
      items: [
        { label: "Today", icon: "home", screenId: todayId },
        { label: "Pair", icon: "users", screenId: pair.id },
        { label: "Me", icon: "user", screenId: profile.id },
      ],
      activeIndex: 1,
    }),
  ]);

  // Cycle complete
  const complete = addScreen(state, deps, "Cycle complete", "/cycle/complete");
  appendBlocks(state, deps, complete.id, "app", [
    b("status-bar", { variant: "dark", time: "07:02", batteryPct: 80 }),
    b("page-header", {
      title: "21일을 같이 했네요.",
      subtitle: "지호님과",
      breadcrumbs: [],
      actions: [],
    }),
    b("avatar", {
      name: "이서연 + 박지호",
      src: "",
      size: "lg",
      subtitle: "사이클 #3 종료",
    }),
    b("stat", {
      label: "함께한 날",
      value: "21",
      change: "",
      changeKind: "none",
    }),
    b("stat", {
      label: "Sick day",
      value: "1",
      change: "",
      changeKind: "none",
    }),
    b("stat", {
      label: "Symmetry",
      value: "0.92",
      change: "",
      changeKind: "none",
    }),
    b("card-grid", {
      columns: 1,
      cards: [
        { title: "다시 21일", desc: "같은 습관으로 한 사이클 더" },
        { title: "다른 습관으로", desc: "각자 새 습관, 페어는 유지" },
        { title: "여기까지", desc: "사이클 종료, 통계 보존" },
      ],
    }),
    b("button", {
      label: "다시 21일",
      variant: "primary",
      size: "lg",
      action: { kind: "screen", screenId: todayId },
      icon: "",
      disabled: false,
    }),
    b("button", {
      label: "다른 습관으로",
      variant: "secondary",
      size: "md",
      action: { kind: "none" },
      icon: "",
      disabled: false,
    }),
    b("button", {
      label: "여기까지",
      variant: "ghost",
      size: "md",
      action: { kind: "none" },
      icon: "",
      disabled: false,
    }),
  ]);

  addScreenEdge(state, deps, onboarding.id, todayId, "시작");
  addScreenEdge(state, deps, todayId, detail.id, "탭");
  addScreenEdge(state, deps, todayId, pair.id, "Pair");
  addScreenEdge(state, deps, todayId, profile.id, "Me");
  addScreenEdge(state, deps, pair.id, invite.id, "초대 링크");
  addScreenEdge(state, deps, todayId, complete.id, "사이클 종료");

  state.currentScreenId = todayId;
}
