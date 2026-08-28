# Import Transform Ledger — repair handoff

## Status: READY

Repair work for verifier report commit `3bb3f8f624ce179bf9ae1feaa031114cbf141b8f`
against candidate `601a48117cbeab7be48dbdb724a4b1c8115b142e` is complete.
The PWA remains a Vite + TypeScript static artifact with output in `dist/`.

## Findings repaired

1. **ITL-QA-001 — recipe checksum identity.** A workspace now owns one
   persisted `recipeCreatedAt` value. Recipe download and checksum-report
   generation serialize the same recipe bytes. The browser regression downloads
   both artifacts and compares the report value with an independent Node
   SHA-256 of the downloaded recipe.
2. **ITL-QA-002 — invalid rows claiming duplicate keys.** A row may enter the
   dedupe index only after all transforms and required-field checks pass. The
   exact impossible-date row followed by a valid leap-day row now yields one
   rejection, one ready row, and zero duplicates.
3. **ITL-QA-003 — unavailable checkout.** Production billing currently returns
   404 and the public catalog contains no entry for this slug. Default builds
   therefore fail closed: they show an honest “Purchases are not open” state
   and contain no buy link. The production Sociobot checkout integration is
   retained behind `VITE_BILLING_ENABLED=true`, which must only be set after the
   factory registers the slug and confirms a successful checkout response. The
   complete free workflow and license restore/reconciliation remain available.
4. **ITL-QA-004 — corrupt v1 recipes.** Import now validates schema/version,
   name, timestamp, unique source and target headers, complete one-to-one target
   coverage, source references, transform kinds, all rule field types, and
   dedupe keys. Errors are actionable and occur before workspace mutation.
5. **ITL-QA-005 — unaccounted CSV cells.** Source rows whose field count differs
   from the header are rejected before mapping with the source row and both
   widths in the error; cells are never silently discarded.
6. **ITL-QA-006 — mobile legibility and targets.** Mapping annotations,
   required labels, stage text, table labels, and footer/legal text now meet the
   recorded 14px annotation scale. Required controls and links meet the 44px
   target baseline. The 390px regression checks computed size and geometry.
7. **ITL-QA-007 — delivery policy.** Vite now emits content-hashed JS/CSS,
   public hero assets are content-addressed, and the service-worker precache is
   finalized from the actual build with a content-derived cache version. Azure
   Static Web Apps configuration sets manifest/AVIF MIME types, immutable asset
   caching, no-store service-worker caching, CSP/frame protections,
   Permissions-Policy, `nosniff`, referrer policy, and one-year HSTS.

The broader keyboard pass also found and repaired a skip-link focus defect by
making the `main` target programmatically focusable.

## Exact verification evidence

Run from a clean dependency install on 2026-08-28 UTC:

```sh
npm ci
npm test
npm run lint
npm run typecheck
VITE_BILLING_ENABLED=true npm run build
npm run build
npm run test:e2e
npm audit --audit-level=high
```

- `npm ci`: 60 packages installed; 0 vulnerabilities.
- Unit/config: 15/15 passed. This includes the exact dedupe, corrupt-recipe,
  row-width, content-addressing, MIME, caching, and response-policy regressions.
- Playwright 1.58.2 Chromium: 9/9 passed. Coverage includes independent recipe
  checksum comparison, error recovery, IndexedDB refresh restoration, true
  offline reload, service-worker update toast/activation/offline continuation,
  390px layout and target sizing, closed checkout, axe, keyboard skip/focus,
  reduced motion, privacy/terms, and same-origin-only free workflow traffic.
- Typecheck/lint: passed (`tsc --noEmit`); `git diff --check`: passed.
- Production build: passed; `dist/index.html` is at the artifact root.
- Dependency audit: 0 vulnerabilities.
- Worker `verify-url.sh` against the production preview: HTTP 200, title/lang,
  one `h1`, `main`, all image alt attributes, labelled buttons, and zero
  console/page errors passed at desktop and 390px.
- Chromium manifest inspection: zero parse errors and zero installability
  errors.
- Manual screenshot inspection at 1440px and 390px: no page overflow, clipping,
  image artifacts, or visual regression. Computed widths equalled the viewport.
- Accessibility: the Playwright axe integration found no serious or critical
  violations on home, mapping, review, mobile, privacy, or terms states. The
  standalone axe CLI could not pair its bundled ChromeDriver 152 with the
  worker's pinned Chromium 145; the equivalent in-suite axe engine 4.13.0 was
  used successfully.
- Lighthouse 12.8.2 mobile preview: Performance 100, Accessibility 100, Best
  Practices 100, SEO 100; FCP 1.0s, LCP 1.3s, TBT 0ms, CLS 0, total 58KiB.
- Build budgets: JS 37,200 bytes (12,048 bytes gzip), CSS 17,858 bytes (4,583
  bytes gzip), no fonts, mobile AVIF 25,767 bytes.
- Package/consumer verification: not applicable to this static PWA.

## Privacy and data ownership

CSV contents never leave the browser. The free workflow made same-origin
requests only. Workspaces, recipes, and runs remain in IndexedDB; license token
and cached verdict remain in localStorage. Recipe JSON and CSV/JSON handoff
exports remain free. There are no analytics, CDN fonts, or third-party runtime
scripts.

## Deployment and remaining external action

Deploy with the work-order configuration:

```sh
npm ci && npm test && npm run build
/opt/fleet/lib/deploy-static.sh import-transform-ledger /work/repo/dist
```

The only external follow-up is factory billing registration. Until the public
catalog contains `import-transform-ledger` and its checkout no longer returns
404, leave `VITE_BILLING_ENABLED` unset. This is a deliberate fail-closed state,
not a broken product path; all researched import, transformation, audit,
recipe-rerun, export, privacy, and offline behavior is available.
