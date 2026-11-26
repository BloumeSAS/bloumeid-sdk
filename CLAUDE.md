# CLAUDE.md — Règles de Gouvernance (`@bloume/id` / `BloumeSAS/bloumeid-sdk`)

Ce document régit le dépôt SDK **`BloumeSAS/bloumeid-sdk`** (imbriqué localement dans `packages/bloumeid/` du monorepo `BloumeSAS/BloumeID`).

---

## 1. Architecture & Qualité
- **Package publiable** : `@bloume/id` (ESM, CJS, UMD `window.BloumeID` & `window.FingerprintJS`, `.d.ts`) compilé avec `tsup`.
- **Zéro dépendance runtime** (`dependencies` vide).
- **TypeScript Strict** : `strict: true`, zéro `any` explicite dans `src/`.
- **Tests & Couverture** : `pnpm test`, `pnpm typecheck`, `pnpm lint` et `pnpm build` doivent tous passer avant tout commit/merge.

---

## 2. Versioning SemVer & README Auto-Sync Obligatoire
- Toujours incrémenter la version via la racine du monorepo avec `pnpm bump:version <patch|minor|major> --all` :
  - Met à jour `packages/bloumeid/package.json`, `SDK_VERSION` dans `packages/bloumeid/src/index.ts`, `packages/bloumeid/README.md`, ainsi que le badge SDK dans le `README.md` racine.
  - Relance automatiquement `pnpm --filter @bloume/id build`.

---

## 3. Double Contrôle Git & Workflow Automatique Obligatoire
1. **Synchronisation & Branche** : `git checkout main && git pull --rebase origin main && git checkout -b <type>/<nom-court>` (ne jamais coder directement sur `main`).
2. **Validation & Commit** : `pnpm typecheck && pnpm lint && pnpm test && pnpm build` puis commit conventionnel (`feat(...)`, `fix(...)`, `docs(...)`, `chore(...)`).
3. **Push, Merge & Nettoyage** : `git push -u origin <type>/<nom-court>` $\rightarrow$ `git checkout main && git pull --rebase origin main && git merge --no-ff <type>/<nom-court> -m "merge: <type>/<nom-court> into main" && git push origin main` $\rightarrow$ suppression de la branche locale et distante.
4. **Synchronisation Monorepo (`BloumeSAS/BloumeID`)** : Après push sur `bloumeid-sdk`, vérifier à la racine de `BloumeID` que **seul `packages/bloumeid/README.md`** est suivi (`git ls-files packages/bloumeid`) avant de commiter et pousser `BloumeID`.
