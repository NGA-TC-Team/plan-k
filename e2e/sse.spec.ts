import { createProjectApi, expect, test } from "./fixtures";

// Verifies the /api/plans/[id]/stream SSE channel by using the browser's
// built-in EventSource: open the stream from a page, append an intent via
// the API on another connection, observe the "intent" event payload.
test("SSE: appendIntent broadcasts to subscribers of the same plan", async ({
  page,
  request,
  cleanup,
}) => {
  const { id: planId } = await createProjectApi(request, {
    kind: "web",
    title: "SSE plan",
  });
  cleanup.ids.push(planId);

  // Need a real origin (not about:blank) so the EventSource resolves the
  // /api path correctly. The home page is fine.
  await page.goto("/");

  // Subscribe in the page context. Resolves with the first "intent" event's
  // parsed data, or rejects on timeout.
  const eventPromise = page.evaluate<{ id: string; origin: string }, string>(
    (planIdArg) =>
      new Promise((resolve, reject) => {
        const es = new EventSource(`/api/plans/${planIdArg}/stream`);
        const timer = setTimeout(() => {
          es.close();
          reject(new Error("timeout waiting for intent event"));
        }, 5000);
        es.addEventListener("intent", (e) => {
          clearTimeout(timer);
          es.close();
          try {
            resolve(JSON.parse((e as MessageEvent).data));
          } catch (err) {
            reject(err);
          }
        });
        es.addEventListener("ready", () => {
          // signal that the stream is open — fire-and-forget
          window.dispatchEvent(new Event("plan-stream:ready"));
        });
      }),
    planId,
  );

  // Wait until the stream is open before posting, so we don't race past
  // the subscriber attachment.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        window.addEventListener("plan-stream:ready", () => resolve(), {
          once: true,
        });
      }),
  );

  const entry = {
    id: crypto.randomUUID(),
    planId,
    origin: "e2e:writer",
    lamport: Date.now(),
    intent: { type: "SELECT_NODE", nodeId: null },
    createdAt: Date.now(),
    kind: "primary" as const,
  };
  const appendRes = await request.post("/api/intents", { data: entry });
  expect(appendRes.ok()).toBeTruthy();

  const received = await eventPromise;
  expect(received.id).toBe(entry.id);
  expect(received.origin).toBe("e2e:writer");
});
