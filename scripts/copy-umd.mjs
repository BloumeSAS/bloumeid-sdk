import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const umdSource = resolve(__dirname, "../dist/bloumeid.global.js");
const webPublicTarget = resolve(__dirname, "../../../apps/web/public/sdk/v1/bloumeid.js");

if (existsSync(umdSource)) {
  mkdirSync(dirname(webPublicTarget), { recursive: true });
  copyFileSync(umdSource, webPublicTarget);
  console.log("[bloumeid/sdk] Copied UMD bundle to apps/web/public/sdk/v1/bloumeid.js");
}
