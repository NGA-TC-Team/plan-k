import { createProjectApi, expect, test } from "./fixtures";

test("search finds project title and section title across plans", async ({
  request,
  cleanup,
}) => {
  const { id: planId } = await createProjectApi(request, {
    kind: "web",
    title: "ZetaUniqueSearch",
    summary: "needle in the summary too",
  });
  cleanup.ids.push(planId);

  const res = await request.get(
    `/api/search?q=${encodeURIComponent("ZetaUniqueSearch")}`,
  );
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(Array.isArray(body.hits)).toBeTruthy();
  expect(body.hits.length).toBeGreaterThan(0);
  const projectHit = body.hits.find(
    (h: { kind: string; planId: string }) =>
      h.kind === "project" && h.planId === planId,
  );
  expect(projectHit).toBeTruthy();
});

test("empty query returns empty hits without 4xx", async ({ request }) => {
  const res = await request.get("/api/search?q=");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.hits).toEqual([]);
});
