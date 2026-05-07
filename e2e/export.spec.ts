import { expect, test } from "./fixtures";

test("PDF export endpoint returns a non-empty PDF for the seed plan", async ({
  request,
}) => {
  const res = await request.get("/api/exports/pdf?planId=demo-web");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("application/pdf");
  const body = await res.body();
  expect(body.byteLength).toBeGreaterThan(1000);
  // PDFs start with the magic bytes "%PDF"
  expect(body.subarray(0, 4).toString("utf8")).toBe("%PDF");
});

test("PNG export endpoint returns a non-empty PNG for the seed plan", async ({
  request,
}) => {
  const res = await request.get("/api/exports/png?planId=demo-web");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("image/png");
  const body = await res.body();
  expect(body.byteLength).toBeGreaterThan(1000);
  // PNG magic: 89 50 4E 47 0D 0A 1A 0A
  expect(
    body
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  ).toBeTruthy();
});

test("PDF export with sectionId returns scoped output", async ({ request }) => {
  // seed plan exposes its sections via the plans API
  const planRes = await request.get("/api/plans/demo-web");
  expect(planRes.ok()).toBeTruthy();
  const plan = await planRes.json();
  const sectionId = plan.snapshot.docsRootIds?.[0];
  test.skip(!sectionId, "demo-web has no docs root section");

  const res = await request.get(
    `/api/exports/pdf?planId=demo-web&sectionId=${encodeURIComponent(sectionId)}`,
  );
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toBe("application/pdf");
});
