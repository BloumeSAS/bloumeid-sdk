<div align="center">

# `@bloume/id` — BloumeID SDK (`@bloume/id v1.1.0`)

**SDK JavaScript/TypeScript Zéro Dépendance pour [BloumeID](https://github.com/BloumeSAS/BloumeID) — Fingerprinting 104 Signaux, Anti-Spoofing & Dual-API**

[![Version](https://img.shields.io/badge/version-v1.1.0-635bff?style=for-the-badge)](https://www.npmjs.com/package/@bloume/id)
[![npm](https://img.shields.io/npm/v/@bloume/id?style=for-the-badge&color=cb3837&logo=npm)](https://www.npmjs.com/package/@bloume/id)
[![Bundle Size](https://img.shields.io/badge/bundle-%3C%2040%20Ko-10b981?style=for-the-badge)](https://www.npmjs.com/package/@bloume/id)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-10b981?style=for-the-badge)](package.json)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)

[Dépôt Principal BloumeID](https://github.com/BloumeSAS/BloumeID) • [Dépôt SDK](https://github.com/BloumeSAS/bloumeid-sdk) • [Package npm](https://www.npmjs.com/package/@bloume/id) • [Bloume SAS](https://bloume.fr)

</div>

---

## Installation

```bash
pnpm add @bloume/id
# ou
npm install @bloume/id
```

- **Zéro dépendance runtime** (`dependencies: {}`).
- **Poids ultra-léger** : `< 40 Ko` (ESM, CJS, UMD global `window.BloumeID` & `window.FingerprintJS`, déclarations `.d.ts`).

---

## Guide d'Utilisation Rapide

### Client (Mode ThumbmarkJS & Fingerprint.com)

```typescript
import { BloumeID } from "@bloume/id";

const client = new BloumeID({
  apiKey: "bid_pub_votre_cle_publique",
  endpoint: "https://id.votre-domaine.fr/api/v1/fingerprint",
});

const result = await client.get({
  linkedId: "user_42",
  tag: { flow: "checkout" },
});

console.log(result.visitorId, result.requestId, result.info.dangerLevel);
```

```typescript
// Drop-in Fingerprint.com (FingerprintJS Pro)
import FingerprintJS from "@bloume/id";

const fp = await FingerprintJS.load({
  apiKey: "bid_pub_votre_cle_publique",
  endpoint: "https://id.votre-domaine.fr/api/v1/fingerprint",
});

const result = await fp.get({ extendedResult: true });
console.log(result.visitorId, result.incognito, result.ipLocation);
```

### Serveur (`@bloume/id/server`)

```typescript
import { BloumeIDServer } from "@bloume/id/server";

const server = new BloumeIDServer({
  secretKey: process.env.BLOUMEID_SECRET_KEY!,
  endpoint: process.env.BLOUMEID_PUBLIC_URL!,
});

const verification = await server.verifyRequest(requestId);
if (verification.dangerLevel >= 3 || verification.flags.isBot) {
  throw new Error("Requête à haut risque bloquée");
}
```

---

## Les 104 Signaux Collectés (4 Catégories)

| Catégorie | Exemples de Signaux |
| :--- | :--- |
| **Rendu Graphique & GPU** | Canvas 2D + sous-pixels Emoji, WebGL 1/2, pixel hash 3D, WebGPU adapter & limits, détection GPU virtuels (`SwiftShader`, `llvmpipe`, `VMware`) |
| **Audio, Polices & Médias** | `OfflineAudioContext` (oscillateur + compresseur), 85+ polices OS, codecs vidéo/audio (`H.264`, `VP9`, `AV1`, `Opus`), voix `speechSynthesis` |
| **Navigateur, Écran & Matériel** | `hardwareConcurrency`, `deviceMemory`, matrice CSS Media (HDR, gamut, `prefers-color-scheme`), écran & DPR, `Intl` / fuseau horaire, `User-Agent Client Hints` |
| **Sondes Anti-Spoof & Anti-Bot** | Intégrité `Function.prototype.toString`, cohérence UA/plateforme, détection `Playwright` / `Puppeteer` / `Selenium` / CDP / WebDriver |

---

## Options de Configuration

```typescript
const client = new BloumeID({
  apiKey: "bid_pub_...",
  endpoint: "https://id.votre-domaine.fr/api/v1/fingerprint",
  exclude: ["webrtc"], // Exclure certains collecteurs (ex: 'webrtc', 'audio', 'webgpu')
  timeoutMs: 300,       // Timeout par collecteur asynchrone
  cacheLifetimeMs: 60_000, // Durée du cache local des signaux
  revision: "v1",       // Révision de schéma
});
```

---

## Développement dans le Monorepo BloumeID

Ce dépôt (`BloumeSAS/bloumeid-sdk`) est conçu pour être cloné dans `packages/bloumeid/` du monorepo principal **[BloumeSAS/BloumeID](https://github.com/BloumeSAS/BloumeID)** :

```bash
git clone https://github.com/BloumeSAS/BloumeID.git
cd BloumeID
git clone https://github.com/BloumeSAS/bloumeid-sdk.git packages/bloumeid
pnpm install
pnpm --filter @bloume/id test
pnpm --filter @bloume/id build
```

---

## Licence

MIT — © 2026 **[Bloume SAS](https://bloume.fr)**
