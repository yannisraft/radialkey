import { readFileSync } from "node:fs";
import { defineConfig, build, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { manifest } from "./manifest.config";

const root = dirname(fileURLToPath(import.meta.url));
let buildingContent = false;

function chromeExtension(): Plugin {
  return {
    name: "radialkey-extension",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "manifest.json",
        source: JSON.stringify(manifest, null, 2),
      });
      this.emitFile({
        type: "asset",
        fileName: "emoji-data.json",
        source: readFileSync(
          resolve(root, "node_modules/emoji-picker-element-data/en/emojibase/data.json"),
        ),
      });
    },
    async closeBundle() {
      if (buildingContent) return;
      buildingContent = true;
      try {
        await build({
          configFile: false,
          root,
          base: "./",
          plugins: [react()],
          define: {
            "process.env.NODE_ENV": JSON.stringify("production"),
          },
          build: {
            emptyOutDir: false,
            outDir: resolve(root, "dist"),
            cssCodeSplit: false,
            rollupOptions: {
              input: resolve(root, "src/content/index.ts"),
              output: {
                format: "iife",
                name: "RadialKeyContent",
                dir: resolve(root, "dist"),
                entryFileNames: "content.js",
                inlineDynamicImports: true,
              },
            },
          },
        });
      } finally {
        buildingContent = false;
      }
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), chromeExtension()],
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        options: resolve(root, "src/options/index.html"),
        background: resolve(root, "src/background/index.ts"),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === "background" ? "background.js" : "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
