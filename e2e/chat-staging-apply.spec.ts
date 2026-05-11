import { createProjectApi, expect, test } from "./fixtures";

// ─── helpers ────────────────────────────────────────────────────────────────

import type { APIRequestContext } from "@playwright/test";

/**
 * Creates an approval-mode chat session and returns its id.
 * LLM is never invoked — we only need the session row so the staging FK
 * (chat_staged_intents.session_id → chat_sessions.id) is satisfied.
 */
async function createSession(
  request: APIRequestContext,
  planId: string,
): Promise<string> {
  const res = await request.post("/api/chat/sessions", {
    data: { planId, mode: "approval" },
  });
  expect(res.status(), `POST /api/chat/sessions: ${await res.text()}`).toBe(
    201,
  );
  const { id } = await res.json();
  return id as string;
}

/**
 * Creates a tool-role message via the notes endpoint (LLM-free).
 * The chatStagedIntents schema has a FK `message_id → chat_messages.id`,
 * so we must create a real row before staging.
 */
async function createNoteMessage(
  request: APIRequestContext,
  sessionId: string,
): Promise<string> {
  const res = await request.post(`/api/chat/sessions/${sessionId}/notes`, {
    data: { text: "e2e staging anchor" },
  });
  expect(
    res.status(),
    `POST /api/chat/sessions/${sessionId}/notes: ${await res.text()}`,
  ).toBe(201);
  const { id } = await res.json();
  return id as string;
}

// ─── Scenario 1 ─────────────────────────────────────────────────────────────

// Verifies the full staging → apply pipeline without any LLM calls.
// API-level only: no UI selectors, no SSE polling.
test("staged INSERT_BLOCK intent applies and appears in tailEntries", async ({
  request,
  cleanup,
}) => {
  // 1. Create project + plan.
  const { id: planId } = await createProjectApi(request, {
    kind: "web",
    title: "PR-E chat staging",
  });
  cleanup.ids.push(planId);

  // 2. Create a chat session in approval mode (no LLM).
  const sessionId = await createSession(request, planId);

  // 3. Create a real message row via the notes endpoint so the staging FK
  //    (chat_staged_intents.message_id → chat_messages.id) is satisfied.
  const messageId = await createNoteMessage(request, sessionId);

  // 4. Obtain the first docs section from the seeded plan snapshot.
  //    Matches the identical pattern in blocks.spec.ts.
  const planRes = await request.get(`/api/plans/${planId}`);
  expect(
    planRes.ok(),
    `GET /api/plans/${planId}: ${await planRes.text()}`,
  ).toBeTruthy();
  const plan = await planRes.json();
  const sectionId: string = plan.snapshot.docsRootIds[0];
  expect(
    typeof sectionId,
    "plan must have at least one seeded docs root section",
  ).toBe("string");

  // 5. Build IntentLogEntry — INSERT_BLOCK with docs context.
  //    lamport = Date.now() following blocks.spec.ts convention.
  const blockId = crypto.randomUUID();
  const now = Date.now();
  const entry = {
    id: crypto.randomUUID(),
    planId,
    origin: "e2e:chat-staging",
    lamport: now,
    createdAt: now,
    kind: "primary" as const,
    intent: {
      type: "INSERT_BLOCK" as const,
      parentId: sectionId,
      block: {
        id: blockId,
        parentId: sectionId,
        kind: "paragraph" as const,
        data: { markdown: "# Staged by e2e" },
        context: "docs" as const,
      },
    },
  };

  // 6. Stage the intent via the approval-mode staging endpoint.
  const stagingRes = await request.post(
    `/api/chat/sessions/${sessionId}/staging?messageId=${messageId}`,
    { data: entry },
  );
  expect(
    stagingRes.ok(),
    `POST staging: ${await stagingRes.text()}`,
  ).toBeTruthy();
  const stagingBody = await stagingRes.json();
  expect(stagingBody.ok, "staging response must carry ok:true").toBe(true);
  const stagedId: string = stagingBody.stagedId;
  expect(typeof stagedId, "stagedId must be a string").toBe("string");

  // 7. Pre-apply assertion: block must NOT yet appear in tailEntries.
  const beforeApply = await request
    .get(`/api/plans/${planId}`)
    .then((r) => r.json());
  const earlyHit = (
    beforeApply.tailEntries as {
      intent: { type: string; block?: { id: string } };
    }[]
  ).find(
    (e) => e.intent.type === "INSERT_BLOCK" && e.intent.block?.id === blockId,
  );
  expect(
    earlyHit,
    "block must not be in tailEntries before apply",
  ).toBeUndefined();

  // 8. Apply the staged intent.
  const applyRes = await request.post(`/api/chat/staged/${stagedId}/apply`);
  expect(applyRes.ok(), `POST apply: ${await applyRes.text()}`).toBeTruthy();
  const applyBody = await applyRes.json();
  expect(applyBody.ok, "apply response must carry ok:true").toBe(true);

  // 9. Post-apply assertion: block must appear in tailEntries.
  const afterApply = await request
    .get(`/api/plans/${planId}`)
    .then((r) => r.json());
  const tailHit = (
    afterApply.tailEntries as {
      intent: { type: string; block?: { id: string } };
    }[]
  ).find(
    (e) => e.intent.type === "INSERT_BLOCK" && e.intent.block?.id === blockId,
  );
  expect(
    tailHit,
    `INSERT_BLOCK(${blockId}) must appear in tailEntries after apply`,
  ).toBeTruthy();
});

// ─── Scenario 2 ─────────────────────────────────────────────────────────────

// Verifies the `staged.status !== "staged"` guard in apply/route.ts:24.
test("re-applying an already-applied staged intent returns 409", async ({
  request,
  cleanup,
}) => {
  const { id: planId } = await createProjectApi(request, {
    kind: "web",
    title: "PR-E double apply",
  });
  cleanup.ids.push(planId);

  const sessionId = await createSession(request, planId);
  const messageId = await createNoteMessage(request, sessionId);

  const planData = await request
    .get(`/api/plans/${planId}`)
    .then((r) => r.json());
  const sectionId: string = planData.snapshot.docsRootIds[0];

  const blockId = crypto.randomUUID();
  const now = Date.now();
  const entry = {
    id: crypto.randomUUID(),
    planId,
    origin: "e2e:chat-staging-dup",
    lamport: now,
    createdAt: now,
    kind: "primary" as const,
    intent: {
      type: "INSERT_BLOCK" as const,
      parentId: sectionId,
      block: {
        id: blockId,
        parentId: sectionId,
        kind: "paragraph" as const,
        data: { markdown: "# Double apply test" },
        context: "docs" as const,
      },
    },
  };

  // Stage once.
  const stagingRes = await request.post(
    `/api/chat/sessions/${sessionId}/staging?messageId=${messageId}`,
    { data: entry },
  );
  expect(
    stagingRes.ok(),
    `POST staging: ${await stagingRes.text()}`,
  ).toBeTruthy();
  const { stagedId } = await stagingRes.json();

  // First apply — must succeed.
  const firstApply = await request.post(`/api/chat/staged/${stagedId}/apply`);
  expect(
    firstApply.ok(),
    `first apply: ${await firstApply.text()}`,
  ).toBeTruthy();

  // Second apply — must fail with 409.
  const secondApply = await request.post(`/api/chat/staged/${stagedId}/apply`);
  expect(
    secondApply.status(),
    "re-applying an applied staged intent must return 409",
  ).toBe(409);
  const secondBody = await secondApply.json();
  expect(secondBody.reason, "409 body must carry ALREADY_RESOLVED reason").toBe(
    "ALREADY_RESOLVED",
  );
});
