<h1 align="center">BloumeID SDK (<code>@bloume/id</code>)</h1>

<p align="center">
  Official zero-dependency JavaScript/TypeScript SDK for <a href="https://github.com/BloumeSAS/BloumeID">BloumeID</a> — open-source device intelligence, anti-spoofing, and fraud prevention with Dual-API compatibility (ThumbmarkJS &amp; Fingerprint.com).
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@bloume/id"><img src="https://img.shields.io/npm/v/@bloume/id.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/@bloume/id"><img src="https://img.shields.io/npm/dm/@bloume/id.svg" alt="NPM Downloads" /></a>
  <a href="https://github.com/BloumeSAS/bloumeid-sdk/actions/workflows/publish.yml"><img src="https://github.com/BloumeSAS/bloumeid-sdk/actions/workflows/publish.yml/badge.svg" alt="Publish" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
  <br/><br/>
  <a href="https://www.buymeacoffee.com/bloumesas"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=☕&slug=bloumesas&button_colour=BD5FFF&font_colour=ffffff&font_family=Cookie&outline_colour=000000&coffee_colour=FFDD00" /></a>
</p>

---

## 🚀 Getting Started

```bash
npm install @bloume/id
# or
pnpm add @bloume/id
```

---

## 🔒 Provenance & Supply Chain Security

Every published version of `@bloume/id` is **built and signed on GitHub Actions**.

| | |
|---|---|
| **Built and signed on** | ✅ GitHub Actions |
| **Source Commit** | [github.com/BloumeSAS/bloumeid-sdk](https://github.com/BloumeSAS/bloumeid-sdk/commits/main) |
| **Build File** | [`.github/workflows/publish.yml`](.github/workflows/publish.yml) |

---

## 🌟 Key Features
- **⚡ 104 Deterministic Signals**: Canvas, WebGL2, WebGPU, OfflineAudioContext, Fonts, Math, Screen/HDR, and Anti-Hook detection.
- **🪶 Zero Runtime Dependencies**: `dependencies: {}` — tiny UMD, ESM, and CJS bundles.
- **🔄 Dual-API Drop-in Compatibility**: Works seamlessly with **ThumbmarkJS** and **Fingerprint.com (FingerprintJS Pro)** schemas.
- **🛡️ Full TypeScript Support**: Strict types (`BloumeIDResult`, `BloumeIDServer`) out of the box.

---

## ✍️ Example

### Browser
```typescript
import { BloumeID } from "@bloume/id";

const client = new BloumeID({
  apiKey: "bid_pub_your_public_key",
  endpoint: "https://your-bloumeid-instance.com/api/v1/fingerprint",
});

const result = await client.get({ tag: "checkout" });
console.log(result.visitorId, result.thumbmark, result.info.dangerLevel);
```

### Server Verification (`@bloume/id/server`)
```typescript
import { BloumeIDServer } from "@bloume/id/server";

const server = new BloumeIDServer({
  secretKey: process.env.BLOUMEID_SECRET_KEY!,
  endpoint: "https://your-bloumeid-instance.com",
});

const verified = await server.verifyRequest(requestId);
if (verified.info.isBot || verified.info.dangerLevel >= 3) {
  // Block or challenge request
}
```
