import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function expectNoSeriousViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([]);
}

test("runs the example import through review and export", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/");
  await expect(page).toHaveTitle(/Import Transform Ledger/);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("main")).toHaveCount(1);
  await page.getByRole("button", { name: "Try the example" }).click();
  await expect(page.getByRole("heading", { name: "Map the ledger columns" })).toBeVisible();
  await expectNoSeriousViolations(page);
  await page.getByRole("button", { name: "Set row rules" }).click();
  await page.getByRole("button", { name: "Review transformed rows" }).click();
  await expect(page.getByText("Duplicate of source row 3 by customer_id")).toBeVisible();
  await expect(page.getByText(/not a valid day\/month\/year date/)).toBeVisible();
  await expect(page.getByText("2", { exact: true }).first()).toBeVisible();
  await expectNoSeriousViolations(page);
  await page.getByRole("button", { name: "Prepare handoff" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export recipe JSON/ }).click();
  expect((await download).suggestedFilename()).toBe("customer-migration-recipe.json");
  expect(errors).toEqual([]);
});

test("restores the local workspace and works offline", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try the example" }).click();
  await expect(page.getByText(/Example loaded/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Restored your local workspace/)).toBeVisible();
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Make every CSV import explain itself." })).toBeVisible();
  await expect(page.getByText(/Offline · all local tools available/)).toBeVisible();
});

test("stacks key controls at a 390px mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Make every CSV import explain itself." })).toBeVisible();
  await page.getByRole("button", { name: "Start an import" }).click();
  await page.waitForTimeout(400);
  const sourceBox = await page.locator(".file-well").nth(0).boundingBox();
  const targetBox = await page.locator(".file-well").nth(1).boundingBox();
  expect(targetBox!.y).toBeGreaterThan(sourceBox!.y);
});

test("has no serious or critical accessibility violations", async ({ page }) => {
  await page.goto("/");
  await expectNoSeriousViolations(page);
});
