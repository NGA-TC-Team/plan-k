import { createProjectApi, expect, test } from "./fixtures";

test("docs rail: add section, rename via side panel, undo restores prior title", async ({
  page,
  request,
  cleanup,
}) => {
  const { id } = await createProjectApi(request, {
    kind: "web",
    title: "Docs flow",
  });
  cleanup.ids.push(id);

  await page.goto(`/plan/${id}`);

  // switch to docs mode
  await page.getByRole("button", { name: /Docs mode/ }).click();

  // baseline: count rail items that match "Section <n>" labels.
  // The rail seeds defaults like "Overview" / "Goals" — newly added roots
  // get the title `Section <docsRoots.length + 1>`.
  const sectionRailItems = page.getByRole("button", { name: /^Section \d+$/ });
  const before = await sectionRailItems.count();

  await page.getByRole("button", { name: "Add section", exact: true }).click();
  await expect(sectionRailItems).toHaveCount(before + 1);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(sectionRailItems).toHaveCount(before);

  await page.getByRole("button", { name: "Redo" }).click();
  await expect(sectionRailItems).toHaveCount(before + 1);
});
