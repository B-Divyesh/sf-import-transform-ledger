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
  await expect(page).toHaveTitle("Import Transform Ledger — Clean CSV imports");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("main")).toHaveCount(1);
  await page.getByRole("link", { name: "Try it with sample data" }).first().click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByRole("heading", { name: "Review transformed rows" })).toBeVisible();
  await expectNoSeriousViolations(page);
  await expect(page.getByText("Duplicate of source row 3 by customer_id")).toBeVisible();
  await expect(page.getByText(/not a valid day\/month\/year date/)).toBeVisible();
  await expect(page.getByText("2", { exact: true }).first()).toBeVisible();
  await expectNoSeriousViolations(page);
  await page.locator('[data-stage="5"]').click();
  const recipeDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export recipe JSON/ }).click();
  const recipe = await recipeDownload;
  expect(recipe.suggestedFilename()).toBe("customer-migration-recipe.json");
  const recipePath = await recipe.path();
  const recipeBytes = await readFile(recipePath!);
  const reportDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export checksum report/ }).click();
  const reportPath = await (await reportDownload).path();
  const report = JSON.parse(await readFile(reportPath!, "utf8")) as { sha256: { recipeJson: string } };
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
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/demo");
  await expect(page.getByText(/Sample data is ready to review/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Restored sample data in this demo/)).toBeVisible();
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Load source and target CSV files" })).toBeVisible();
  const status = page.locator(".status-ribbon");
  await expect(status).toContainText("You are offline. The workspace, recipes, transforms, and exports remain available.");
  await expect(status).toBeVisible();
  await expect(page.locator("html")).toHaveJSProperty("clientWidth", 390);
});

test("announces and applies a service-worker update, then remains offline", async ({ page, context }) => {
  const serviceWorkerPath = new URL("../../dist/sw.js", import.meta.url);
  const original = await readFile(serviceWorkerPath, "utf8");
  try {
    await page.goto("/demo");
    await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);
    const updated = original.replace(/(const VERSION = "[^"]+)/, "$1-e2e-update");
    expect(updated).not.toBe(original);
    await writeFile(serviceWorkerPath, updated);
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
    await expect(page.getByText("An offline update is ready.")).toBeVisible();
    await page.getByRole("button", { name: "Reload" }).click();
    await expect(page.getByRole("heading", { name: "Load source and target CSV files" })).toBeVisible();
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator(".status-ribbon")).toContainText("You are offline. The workspace, recipes, transforms, and exports remain available.");
  } finally {
    await context.setOffline(false);
    await writeFile(serviceWorkerPath, original);
  }
});

test("stacks key controls at a 390px mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Clean and document CSV imports" })).toBeVisible();
  await page.getByRole("button", { name: "Start a real import" }).click();
  await page.waitForTimeout(400);
  const sourceBox = await page.locator(".file-well").nth(0).boundingBox();
  const targetBox = await page.locator(".file-well").nth(1).boundingBox();
  expect(targetBox!.y).toBeGreaterThan(sourceBox!.y);

  await page.getByRole("link", { name: "Try it with sample data" }).first().click();
  await page.locator('[data-stage="2"]').first().click();
  const requiredLabel = page.locator(".mapping-row .check").first();
  expect(Number.parseFloat(await requiredLabel.evaluate((element) => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(14);
  expect((await requiredLabel.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const termsLink = page.locator("footer").getByRole("link", { name: "Terms" });
  expect(Number.parseFloat(await termsLink.evaluate((element) => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(14);
  expect((await termsLink.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

test("does not advertise checkout until the billing product is registered", async ({ page }) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== "http://127.0.0.1:4173") externalRequests.push(request.url());
  });
  await page.goto("/?license=should-not-leave-this-device");
  await expect(page.getByRole("link", { name: /Buy Field Kit/ })).toHaveCount(0);
  await expect(page.locator("#license-token")).toHaveCount(0);
  await expect(page.getByText("Purchases are not open.")).toBeVisible();
  await expect(page.getByText(/no checkout is currently offered/i)).toBeVisible();
  expect(page.url()).not.toContain("license=");
  expect(await page.evaluate(() => localStorage.getItem("sb_license:import-transform-ledger"))).toBeNull();
  expect(externalRequests).toEqual([]);
});

test("serves route metadata and a designed HTTP 404 page", async ({ page }) => {
  await page.goto("/demo");
  await expect(page).toHaveTitle("Demo — Import Transform Ledger");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://import-transform-ledger.sociobot.in/demo");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /social-import-ledger-1200x630/);
  const response = await page.goto("/not-a-real-page");
  expect(response?.status()).toBe(404);
  await expect(page).toHaveTitle("Page not found — Import Transform Ledger");
  await expect(page.getByRole("heading", { name: "This page was not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open the workspace" })).toHaveAttribute("href", "/");
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
  const primaryTransition = await page.getByRole("link", { name: "Try it with sample data" }).first().evaluate((element) => getComputedStyle(element).transitionDuration);
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
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Review transformed rows" })).toBeVisible();
  expect(externalRequests).toEqual([]);
});
