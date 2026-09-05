import { chromium } from "playwright";

const url = process.argv[2];
if (!url) throw new Error("Usage: scripts/verify-url.sh <url>");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const consoleErrors = [];
const pageErrors = [];
page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
page.on("pageerror", (error) => pageErrors.push(error.message));

try {
  const response = await page.goto(url, { waitUntil: "networkidle" });
  const checks = await page.evaluate(() => ({
    title: document.title,
    lang: document.documentElement.lang,
    mainCount: document.querySelectorAll("main").length,
    h1Count: document.querySelectorAll("h1").length,
    missingAlt: [...document.images].filter((image) => !image.hasAttribute("alt")).map((image) => image.src),
  }));
  const expectedDocument404 = response?.status() === 404;
  const actionableConsoleErrors = consoleErrors.filter((error) => !(expectedDocument404 && error.includes("server responded with a status of 404")));
  const result = { url, httpStatus: response?.status(), ...checks, consoleErrors: actionableConsoleErrors, pageErrors };
  if (!checks.title || !checks.lang || checks.mainCount !== 1 || checks.h1Count !== 1 || checks.missingAlt.length || actionableConsoleErrors.length || pageErrors.length) {
    throw new Error(JSON.stringify(result, null, 2));
  }
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
