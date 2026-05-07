import {
  type APIRequestContext,
  test as base,
  expect,
  type Page,
} from "@playwright/test";

export { expect };

type Kind = "web" | "mobile" | "agent";

export const test = base.extend<{
  cleanup: { ids: string[] };
}>({
  cleanup: async ({ request }, use) => {
    const ids: string[] = [];
    await use({ ids });
    for (const id of ids) {
      await request.delete(`/api/projects/${id}`).catch(() => undefined);
    }
  },
});

export async function createProjectApi(
  request: APIRequestContext,
  opts: { kind: Kind; title: string; summary?: string },
): Promise<{ id: string; planId: string }> {
  const res = await request.post("/api/projects", { data: opts });
  expect(res.ok()).toBeTruthy();
  const project = await res.json();
  return { id: project.id as string, planId: project.id as string };
}

export async function createProjectViaUi(
  page: Page,
  opts: { kind: Kind; title: string },
): Promise<string> {
  await page.goto("/projects");
  await page.getByRole("button", { name: "New project" }).click();
  const kindLabel =
    opts.kind === "web"
      ? "Web app"
      : opts.kind === "mobile"
        ? "Mobile app"
        : "AI agent";
  await page.getByRole("dialog").getByText(kindLabel, { exact: true }).click();
  await page.getByLabel("Title").fill(opts.title);
  await page.getByRole("button", { name: /Create \+ open|Creating/ }).click();
  await page.waitForURL(/\/plan\/[^/]+$/);
  const id = new URL(page.url()).pathname.split("/").pop();
  if (!id) throw new Error("project id not found in URL");
  return id;
}
