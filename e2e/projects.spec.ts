import { createProjectViaUi, expect, test } from "./fixtures";

test("create project from /projects → redirects to /plan/[id] and seeds plan", async ({
  page,
  cleanup,
}) => {
  const id = await createProjectViaUi(page, {
    kind: "web",
    title: "E2E web plan",
  });
  cleanup.ids.push(id);

  // builder should mount with the project title visible in the top bar
  await expect(page.getByText("E2E web plan").first()).toBeVisible();

  // back at /projects, the new project appears in the list
  await page.goto("/projects");
  await expect(page.getByRole("link", { name: /E2E web plan/ })).toBeVisible();
});

test("delete project removes it from the list", async ({
  page,
  request,
  cleanup,
}) => {
  // seed via API to keep the test focused on delete UX
  const res = await request.post("/api/projects", {
    data: { kind: "mobile", title: "Delete-me plan" },
  });
  const project = await res.json();
  cleanup.ids.push(project.id);

  await page.goto("/projects");
  const row = page.getByRole("link", { name: /Delete-me plan/ });
  await expect(row).toBeVisible();

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete Delete-me plan" }).click();

  await expect(row).not.toBeVisible();
});
