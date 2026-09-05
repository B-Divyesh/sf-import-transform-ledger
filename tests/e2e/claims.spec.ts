import { expect, test, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

async function openDemo(page: Page): Promise<void> {
  await page.goto("/demo");
  await expect(page).toHaveTitle("Demo — Import Transform Ledger");
  await expect(page.getByText("Demo — sample data, nothing is saved to your real workspace.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Review transformed rows" })).toBeVisible();
}

async function openLoadStage(page: Page): Promise<void> {
  await page.locator('[data-stage="1"]').click();
  await expect(page.getByRole("heading", { name: "Load source and target CSV files" })).toBeVisible();
}

async function loadSourceAndTargets(page: Page, file: { name: string; buffer: Buffer }, targetHeaders: string): Promise<void> {
  await openLoadStage(page);
  await page.locator("#source-file").setInputFiles({ name: file.name, mimeType: "text/csv", buffer: file.buffer });
  await page.locator("#target-manual").fill(targetHeaders);
  await page.getByRole("button", { name: "Set columns" }).click();
  await expect(page.getByText(`${targetHeaders.split(",").length} target columns`)).toBeVisible();
}

async function reviewCurrentData(page: Page): Promise<void> {
  await page.locator('[data-stage="4"]').click();
  await expect(page.getByRole("heading", { name: "Review transformed rows" })).toBeVisible();
}

async function openExportStage(page: Page): Promise<void> {
  await page.locator('[data-stage="5"]').click();
  await expect(page.getByRole("heading", { name: "Export import files" })).toBeVisible();
}

test("processes the sample import in the browser @claim:local-processing", async ({ page }) => {
  await openDemo(page);
  await expect(page.getByText("5", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("2", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("3", { exact: true }).first()).toBeVisible();
});

test("does not send CSV rows over the network @claim:csv-private", async ({ page }) => {
  const requests: Array<{ url: string; method: string; body: string | null }> = [];
  page.on("request", (request) => requests.push({ url: request.url(), method: request.method(), body: request.postData() }));
  await openDemo(page);
  await openExportStage(page);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export ready CSV/ }).click();
  await (await download).path();
  const appOrigin = "http://127.0.0.1:4173";
  expect(requests.every((request) => new URL(request.url).origin === appOrigin)).toBe(true);
  expect(requests.every((request) => request.method === "GET" && !request.body)).toBe(true);
});

test("reloads the sample while offline after first visit @claim:offline-reload", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await openDemo(page);
    await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Load source and target CSV files" })).toBeVisible();
    await expect(page.getByText("supplier-export.csv").first()).toBeVisible();
    await expect(page.locator(".status-ribbon")).toContainText("You are offline. The workspace, recipes, transforms, and exports remain available.");
  } finally {
    await context.close();
  }
});

test("reads UTF-8 and Windows-1252 CSV files @claim:csv-encodings", async ({ page }) => {
  await openDemo(page);
  await loadSourceAndTargets(page, { name: "utf8.csv", buffer: Buffer.from("name,city\nZoë,Århus\n") }, "name,city");
  await reviewCurrentData(page);
  await expect(page.getByRole("cell", { name: "Zoë" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Århus" })).toBeVisible();

  await page.getByRole("button", { name: "Reset demo" }).click();
  await loadSourceAndTargets(page, { name: "legacy.csv", buffer: Buffer.from([0x6e, 0x61, 0x6d, 0x65, 0x2c, 0x63, 0x69, 0x74, 0x79, 0x0a, 0x43, 0x61, 0x66, 0xe9, 0x2c, 0x80, 0x0a]) }, "name,city");
  await expect(page.getByText(/windows-1252/)).toBeVisible();
  await reviewCurrentData(page);
  await expect(page.getByRole("cell", { name: "Café" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "€" })).toBeVisible();
});

test("detects common CSV delimiters @claim:delimiter-detection", async ({ page }) => {
  await openDemo(page);
  await loadSourceAndTargets(page, { name: "semicolon.csv", buffer: Buffer.from("id;name\n1;Ana\n") }, "id,name");
  await reviewCurrentData(page);
  await expect(page.getByRole("cell", { name: "Ana" })).toBeVisible();

  await page.getByRole("button", { name: "Reset demo" }).click();
  await loadSourceAndTargets(page, { name: "tab.csv", buffer: Buffer.from("id\tname\n2\tMika\n") }, "id,name");
  await reviewCurrentData(page);
  await expect(page.getByRole("cell", { name: "Mika" })).toBeVisible();
});

test("preselects only matching column names @claim:exact-header-mapping", async ({ page }) => {
  await openDemo(page);
  await loadSourceAndTargets(page, { name: "legacy.csv", buffer: Buffer.from("Legacy ID,Name\nR-1,Ada\n") }, "customer_id,name");
  await page.locator('[data-stage="2"]').click();
  await expect(page.locator("#source-0")).toHaveValue("");
  await expect(page.locator("#source-1")).toHaveValue("Name");
});

test("applies the same cleanup result after a demo reset @claim:deterministic-transforms", async ({ page }) => {
  await openDemo(page);
  await expect(page.getByRole("cell", { name: "ana@example.com" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "2026-01-31" })).toBeVisible();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.getByRole("cell", { name: "ana@example.com" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "2026-01-31" })).toBeVisible();
});

test("rejects a duplicate after transformed target fields match @claim:duplicate-detection", async ({ page }) => {
  await openDemo(page);
  await expect(page.getByText("Duplicate of source row 3 by customer_id")).toBeVisible();
  await expect(page.getByText("1", { exact: true }).last()).toBeVisible();
});

test("shows an explicit reason for every rejected sample row @claim:rejection-reasons", async ({ page }) => {
  await openDemo(page);
  const rejected = page.locator(".reject-list article");
  await expect(rejected).toHaveCount(3);
  for (let index = 0; index < 3; index += 1) await expect(rejected.nth(index).locator("li")).toHaveCount(1);
});

test("exports ready and rejection CSV files @claim:csv-exports", async ({ page }) => {
  await openDemo(page);
  await openExportStage(page);
  const readyDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export ready CSV/ }).click();
  const readyPath = await (await readyDownload).path();
  const ready = await readFile(readyPath!, "utf8");
  const rejectDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export rejection CSV/ }).click();
  const rejectPath = await (await rejectDownload).path();
  const rejects = await readFile(rejectPath!, "utf8");
  expect(ready).toContain("customer_id,name,email,start_date,region_code");
  expect(ready).toContain("C-100,Ana Torres,ana@example.com,2026-01-31,NORTH");
  expect(rejects).toContain("source_row,reasons,customer_id,name,email,start_date,region_code");
  expect(rejects).toContain("Duplicate of source row 3 by customer_id");
});

test("exports a readable recipe and reruns it @claim:recipe-rerun", async ({ page }) => {
  await openDemo(page);
  await openExportStage(page);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export recipe JSON/ }).click();
  const recipePath = await (await download).path();
  const recipe = await readFile(recipePath!, "utf8");
  expect(recipe).toContain('\n  "mappings"');
  expect(JSON.parse(recipe)).toMatchObject({ name: "Customer migration", version: 1 });
  await openLoadStage(page);
  await page.locator("#recipe-file").setInputFiles({ name: "customer-migration-recipe.json", mimeType: "application/json", buffer: Buffer.from(recipe) });
  await reviewCurrentData(page);
  await expect(page.getByRole("cell", { name: "ana@example.com" })).toBeVisible();
});

test("reports the checksum for the downloaded recipe @claim:checksum-report", async ({ page }) => {
  await openDemo(page);
  await openExportStage(page);
  const recipeDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export recipe JSON/ }).click();
  const recipePath = await (await recipeDownload).path();
  const recipe = await readFile(recipePath!);
  const reportDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export checksum report/ }).click();
  const reportPath = await (await reportDownload).path();
  const report = JSON.parse(await readFile(reportPath!, "utf8")) as { sha256: { recipeJson: string } };
  expect(report.sha256.recipeJson).toBe(createHash("sha256").update(recipe).digest("hex"));
});

test("keeps demo workspace and saved recipes after refresh @claim:local-persistence", async ({ page }) => {
  await openDemo(page);
  await openExportStage(page);
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page.getByText("Saved “Customer migration” on this device.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Restored sample data in this demo.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Customer migration", exact: true })).toBeVisible();
});

test("keeps the complete sample workflow free @claim:free-workflow", async ({ page }) => {
  await openDemo(page);
  await openExportStage(page);
  await expect(page.getByRole("button", { name: /Export ready CSV/ })).toBeEnabled();
  await expect(page.getByRole("button", { name: /Export rejection CSV/ })).toBeEnabled();
  await expect(page.getByRole("link", { name: /Buy Field Kit/ })).toHaveCount(0);
  await expect(page.getByText("Purchases are not open.")).toBeVisible();
});

test("keeps recipe JSON import and export free @claim:free-recipe-json", async ({ page }) => {
  await openDemo(page);
  await openExportStage(page);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export recipe JSON/ }).click();
  const recipePath = await (await download).path();
  const recipe = await readFile(recipePath!, "utf8");
  await openLoadStage(page);
  await page.locator("#recipe-file").setInputFiles({ name: "recipe.json", mimeType: "application/json", buffer: Buffer.from(recipe) });
  await expect(page.getByText(/Imported recipe “Customer migration”/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Buy Field Kit/ })).toHaveCount(0);
});

test("states the closed one-time Field Kit offer honestly @claim:field-kit-offer", async ({ page }) => {
  await openDemo(page);
  await page.goto("/terms/");
  await expect(page.getByText(/Field Kit is a \$29 one-time license/)).toBeVisible();
  await expect(page.getByText(/unlimited saved recipe library/)).toBeVisible();
  await page.goto("/demo");
  await expect(page.getByText("Purchases are not open.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Buy Field Kit/ })).toHaveCount(0);
});

test("loads no trackers, third-party fonts, or third-party runtime scripts @claim:no-third-party-runtime", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await openDemo(page);
  const resources = await page.evaluate(() => performance.getEntriesByType("resource").map((entry) => entry.name));
  const appOrigin = "http://127.0.0.1:4173";
  expect([...requests, ...resources].every((url) => new URL(url).origin === appOrigin)).toBe(true);
  expect(await page.evaluate(() => document.cookie)).toBe("");
});

test("offers an offline update when a new service worker is available @claim:offline-update", async ({ page, context }) => {
  const serviceWorkerPath = new URL("../../dist/sw.js", import.meta.url);
  const original = await readFile(serviceWorkerPath, "utf8");
  try {
    await openDemo(page);
    await page.waitForFunction(() => navigator.serviceWorker?.controller !== null);
    const updated = original.replace(/(const VERSION = "[^"]+)/, "$1-claim-update");
    expect(updated).not.toBe(original);
    await writeFile(serviceWorkerPath, updated);
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.update());
    await expect(page.getByText("An offline update is ready.")).toBeVisible();
    await page.getByRole("button", { name: "Reload" }).click();
    await expect(page.getByRole("heading", { name: "Load source and target CSV files" })).toBeVisible();
    await expect(page.getByText("supplier-export.csv").first()).toBeVisible();
  } finally {
    await context.setOffline(false);
    await writeFile(serviceWorkerPath, original);
  }
});

test("keeps demo reset and exit separate from the real workspace @claim:demo-isolation", async ({ page }) => {
  await page.goto("/");
  await page.locator("#source-file").setInputFiles({ name: "real-source.csv", mimeType: "text/csv", buffer: Buffer.from("client_id,name\nREAL-77,Real Name\n") });
  await page.locator("#target-manual").fill("client_id,name");
  await page.getByRole("button", { name: "Set columns" }).click();
  await expect(page.locator(".file-receipt strong").first()).toHaveText("real-source.csv");
  await page.goto("/demo");
  await expect(page.getByText("supplier-export.csv").first()).toBeVisible();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.getByText("Sample data reset. Your real workspace was not changed.")).toBeVisible();
  await page.getByRole("button", { name: "Start for real" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator(".file-receipt strong").first()).toHaveText("real-source.csv");
  await reviewCurrentData(page);
  await expect(page.getByRole("cell", { name: "REAL-77" })).toBeVisible();
});
