import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";

const assetNames = (await readdir(new URL("../dist/assets/", import.meta.url)))
  .sort()
  .map((name) => `/assets/${name}`);
if (process.env.VITE_BILLING_ENABLED !== "true") {
  const scripts = await Promise.all(assetNames.filter((name) => name.endsWith(".js")).map((name) => readFile(new URL(`../dist${name}`, import.meta.url), "utf8")));
  const closedBuild = scripts.join("\n");
  for (const forbidden of ["api.sociobot.in", "/verify?license=", "license-token"]) {
    if (closedBuild.includes(forbidden)) throw new Error(`Closed-billing build unexpectedly exposes ${forbidden}`);
  }
}
const indexUrl = new URL("../dist/index.html", import.meta.url);
const index = await readFile(indexUrl, "utf8");
const demo = index
  .replaceAll("Import Transform Ledger — Clean CSV imports", "Demo — Import Transform Ledger")
  .replaceAll('content="https://import-transform-ledger.sociobot.in/"', 'content="https://import-transform-ledger.sociobot.in/demo"')
  .replaceAll('href="https://import-transform-ledger.sociobot.in/"', 'href="https://import-transform-ledger.sociobot.in/demo"')
  .replaceAll("Clean and document CSV imports with reviewed mappings, rejects, recipes, and exports on your device.", "Try a sample CSV import with reviewed mappings, rejects, and exports.");
await mkdir(new URL("../dist/demo/", import.meta.url), { recursive: true });
await writeFile(new URL("../dist/demo/index.html", import.meta.url), demo);

const shellFiles = ["index.html", "demo/index.html", "404.html", "offline.html", "legal.css", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png", "privacy/index.html", "terms/index.html"];
const shellBytes = await Promise.all([
  ...assetNames.map((name) => readFile(new URL(`../dist${name}`, import.meta.url))),
  ...shellFiles.map((name) => readFile(new URL(`../dist/${name}`, import.meta.url))),
]);
const fingerprintHash = createHash("sha256");
for (const bytes of shellBytes) fingerprintHash.update(bytes);
const fingerprint = fingerprintHash.digest("hex").slice(0, 12);
const serviceWorkerUrl = new URL("../dist/sw.js", import.meta.url);
let serviceWorker = await readFile(serviceWorkerUrl, "utf8");
serviceWorker = serviceWorker
  .replace("itl-shell-build", `itl-shell-${fingerprint}`)
  .replace('"__BUILD_ASSETS__"', assetNames.map((name) => JSON.stringify(name)).join(",\n  "));
await writeFile(serviceWorkerUrl, serviceWorker);
