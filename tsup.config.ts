import { defineConfig } from "tsup";
import fs from "node:fs";
import path from "node:path";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      server: "src/server.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    minify: true,
    target: "es2020",
    outExtension({ format }) {
      return {
        js: format === "cjs" ? ".cjs" : ".mjs",
      };
    },
  },
  {
    entry: {
      bloumeid: "src/umd.ts",
    },
    format: ["iife"],
    globalName: "BloumeID",
    minify: true,
    sourcemap: false,
    clean: false,
    target: "es2020",
    outExtension() {
      return {
        js: ".global.js",
      };
    },
    onSuccess: async () => {
      const srcFile = path.resolve("dist/bloumeid.global.js");
      const targetDir = path.resolve("../../apps/web/public/sdk/v1");
      if (fs.existsSync(srcFile)) {
        fs.mkdirSync(targetDir, { recursive: true });
        fs.copyFileSync(srcFile, path.join(targetDir, "bloumeid.js"));
      }
    },
  },
]);
