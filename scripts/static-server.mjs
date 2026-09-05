import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve("dist");
const portIndex = process.argv.indexOf("--port");
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : 4173);
const types = {
  ".avif": "image/avif", ".css": "text/css; charset=utf-8", ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon", ".jpg": "image/jpeg", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8", ".webmanifest": "application/manifest+json", ".webp": "image/webp", ".xml": "application/xml; charset=utf-8",
};

function fileFor(pathname) {
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch { return join(root, "404.html"); }
  const clean = normalize(decoded).replace(/^[/\\]+/, "");
  const candidate = resolve(root, clean || "index.html");
  if (!candidate.startsWith(`${root}/`) && candidate !== root) return join(root, "404.html");
  if (existsSync(candidate) && statSync(candidate).isDirectory()) return join(candidate, "index.html");
  return candidate;
}

const server = createServer((request, response) => {
  const pathname = new URL(request.url || "/", "http://localhost").pathname;
  let file = fileFor(pathname);
  let status = 200;
  if (!existsSync(file) || !statSync(file).isFile()) { file = join(root, "404.html"); status = 404; }
  const extension = extname(file);
  response.writeHead(status, {
    "Content-Type": types[extension] || "application/octet-stream",
    "Cache-Control": file.endsWith("/sw.js") ? "no-cache, no-store, must-revalidate" : file.includes("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
  });
  createReadStream(file).pipe(response);
});

server.listen(port, "127.0.0.1", () => console.log(`Static server listening on http://127.0.0.1:${port}`));
process.on("SIGTERM", () => server.close());
process.on("SIGINT", () => server.close());
