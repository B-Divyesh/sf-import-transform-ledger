import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("static release policy", () => {
  it("ships explicit MIME, cache, framing, permissions, and transport policies", async () => {
    const config = JSON.parse(await readFile("public/staticwebapp.config.json", "utf8")) as {
      mimeTypes: Record<string, string>;
      routes: Array<{ route: string; headers: Record<string, string> }>;
      globalHeaders: Record<string, string>;
      responseOverrides: Record<string, { rewrite: string; statusCode: number }>;
    };

    expect(config.mimeTypes[".avif"]).toBe("image/avif");
    expect(config.mimeTypes[".webmanifest"]).toBe("application/manifest+json");
    expect(config.routes.find((route) => route.route === "/assets/*")?.headers["Cache-Control"]).toContain("immutable");
    expect(config.routes.find((route) => route.route === "/sw.js")?.headers["Cache-Control"]).toContain("no-store");
    expect(config.globalHeaders["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(config.globalHeaders["Permissions-Policy"]).toContain("camera=()");
    expect(config.globalHeaders["Strict-Transport-Security"]).toContain("max-age=31536000");
    expect(config.globalHeaders["X-Content-Type-Options"]).toBe("nosniff");
    expect(config.responseOverrides["404"]).toEqual({ rewrite: "/404.html", statusCode: 404 });
  });

  it("uses content-addressed public assets for immutable caching", async () => {
    const names = await readdir("public/assets");
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      const bytes = await readFile(`public/assets/${name}`);
      const digest = createHash("sha256").update(bytes).digest("hex").slice(0, 8);
      expect(name).toContain(`.${digest}.`);
    }
  });
});
