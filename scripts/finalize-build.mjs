import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";

const assetNames = (await readdir(new URL("../dist/assets/", import.meta.url)))
  .sort()
  .map((name) => `/assets/${name}`);
const shellFiles = ["index.html", "offline.html", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png", "privacy/index.html", "terms/index.html"];
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
