import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

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
  const recipeDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export recipe JSON/ }).click();
  const recipe = await recipeDownload;
  expect(recipe.suggestedFilename()).toBe("customer-migration-recipe.json");
  const recipeBytes = await readFile((await recipe.path())!);
  const reportDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export checksum report/ }).click();
  const report = JSON.parse(await readFile((await (await reportDownload).path())!, "utf8")) as { sha256: { recipeJson: string } };
  expect(report.sha256.recipeJson).toBe(createHash("sha256").update(recipeBytes).digest("hex"));
  expect(errors).toEqual([]);
});

test("rejects corrupt recipes and CSV rows with unaccounted cells", async ({ page }) => {
  await page.goto("/");
  await page.locator("#recipe-file").setInputFiles({
    name: "corrupt.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      schema: "import-transform-ledger/recipe",
      version: 1,
      name: "Corrupt",
      createdAt: "2026-01-01T00:00:00.000Z",
      sourceHeaders: ["id"],
      targetHeaders: ["id"],
      mappings: [{ target: "wrong", source: "id", transform: "bogus", required: false, defaultValue: "", find: "", replace: "" }],
      dedupeKeys: [],
    })),
  });
  await expect(page.getByText(/targets an undeclared target header/)).toBeVisible();

  await page.locator("#source-file").setInputFiles({
    name: "over-wide.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("id,name\n1,A,UNACCOUNTED\n2,B"),
  });
  await expect(page.getByText(/Source row 2 has 3 fields.*header has 2.*no cells are lost/)).toBeVisible();
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

test("announces and applies a service-worker update, then remains offline", async ({ page, context }) => {
  const serviceWorkerPath = new URL("../../dist/sw.js", import.meta.url);
  const original = await readFile(serviceWorkerPath, "utf8");
  try {
    await page.goto("/");
    await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);
    const updated = original.replace(/(const VERSION = "[^"]+)/, "$1-e2e-update");
    expect(updated).not.toBe(original);
    await writeFile(serviceWorkerPath, updated);
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
    await expect(page.getByText("An offline update is ready.")).toBeVisible();
    await page.getByRole("button", { name: "Reload" }).click();
    await expect(page.getByRole("heading", { name: "Make every CSV import explain itself." })).toBeVisible();
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByText(/Offline · all local tools available/)).toBeVisible();
  } finally {
    await context.setOffline(false);
    await writeFile(serviceWorkerPath, original);
  }
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

  await page.getByRole("button", { name: "Use safe example data" }).click();
  const requiredLabel = page.locator(".mapping-row .check").first();
  expect(Number.parseFloat(await requiredLabel.evaluate((element) => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(14);
  expect((await requiredLabel.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const termsLink = page.locator("footer").getByRole("link", { name: "Terms" });
  expect(Number.parseFloat(await termsLink.evaluate((element) => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(14);
  expect((await termsLink.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

test("does not advertise checkout until the billing product is registered", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Buy Field Kit/ })).toHaveCount(0);
  await expect(page.getByText("Purchases are not open.")).toBeVisible();
  await expect(page.getByText(/no checkout is currently offered/i)).toBeVisible();
});

test("has no serious or critical accessibility violations", async ({ page }) => {
  await page.goto("/");
  await expectNoSeriousViolations(page);
});

test("supports keyboard focus, reduced motion, and accessible legal pages", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to workspace" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  await page.keyboard.press("Tab");
  const focusedOutline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
  expect(focusedOutline).not.toBe("none");
  const primaryTransition = await page.getByRole("button", { name: "Start an import" }).evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(primaryTransition).toBe("0s");

  for (const path of ["/privacy/", "/terms/"]) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator("main")).toHaveCount(1);
    await expectNoSeriousViolations(page);
  }
});

test("keeps the free workflow same-origin and private", async ({ page }) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== "http://127.0.0.1:4173") externalRequests.push(request.url());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Try the example" }).click();
  await page.getByRole("button", { name: "Set row rules" }).click();
  await page.getByRole("button", { name: "Review transformed rows" }).click();
  await expect(page.getByRole("heading", { name: "Inspect the crossing" })).toBeVisible();
  expect(externalRequests).toEqual([]);
});
