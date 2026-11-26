# `@bloume/id`

Official, zero-dependency browser & server SDK for **BloumeID** — open-source device intelligence, anti-spoofing, and fraud prevention.

- **104 deterministic signals** (Canvas, WebGL2, WebGPU, OfflineAudioContext, Fonts, Math, Screen/HDR, Anti-Hook)
- **Zero runtime dependencies** (`dependencies: {}`)
- **Dual-API drop-in compatibility** with **ThumbmarkJS** and **Fingerprint.com (FingerprintJS Pro)**
- **ESM, CJS, UMD (`window.BloumeID`)** + full TypeScript types

## Installation

```bash
npm install @bloume/id
# or
pnpm add @bloume/id
```

## Quick Start (Browser)

```ts
import { BloumeID } from "@bloume/id";

const client = new BloumeID({
  apiKey: "bid_pub_your_public_key",
  endpoint: "https://your-bloumeid-instance.com/api/v1/fingerprint",
});

const result = await client.get({ tag: "checkout" });
console.log(result.visitorId, result.thumbmark, result.info.dangerLevel);
```

## Server Verification (`@bloume/id/server`)

```ts
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

## Repository & License

- Source: [BloumeSAS/bloumeid-sdk](https://github.com/BloumeSAS/bloumeid-sdk) (synced from [BloumeSAS/BloumeID](https://github.com/BloumeSAS/BloumeID))
- License: MIT © 2026 Bloume SAS
