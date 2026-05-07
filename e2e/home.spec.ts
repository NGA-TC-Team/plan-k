import { expect, test } from "./fixtures";

test("home renders title and links to projects + demos", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "plan-k", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Open your projects/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Web app demo/ })).toBeVisible();
});
