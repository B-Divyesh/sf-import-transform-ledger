import { defineConfig } from "vite";

export default defineConfig({
  build: {
    target: "es2022",
    outDir: "dist",
    assetsInlineLimit: 2048,
    rollupOptions: {
      output: {
        entryFileNames: "assets/app.js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: (asset) => asset.names.some((name) => name.endsWith(".css")) ? "assets/app.css" : "assets/[name][extname]",
      },
    },
  },
});
