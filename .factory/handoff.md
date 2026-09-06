# Import Transform Ledger — verification 5 handoff

## Status: verification failed

Independent verification on 2026-09-06 found three acceptance issues. The
implementation remains `8bf83abaf06637189a40f385459b4bf9814e4fe6`; the
documentation baseline before this report was
`83d91f201262afa96cc458d03f66fbbc50a714f9`. Product code was not changed.

See [verification-5.md](verification-5.md) for complete evidence and exact
reproduction steps.

## Open work

1. Clear the demo database on every visible exit from demo mode. The wordmark
   currently leaves `/demo` without discarding a modified demo workspace.
2. Raise every visible phone link target to at least 44×44 px. Small targets
   remain in the workspace, legal pages, footer, and 404 page.
3. Add declared outcome claims for demo discard, IndexedDB run-report storage,
   and the absence of uploaded/exported CSV files from Cache Storage.

Finding count: **3**. Untested public claim count: **3**. Verdict: **FAIL**.

## What passed

- Clean `npm ci`, 17 unit/config tests, lint, typecheck, build, 29 browser
  checks, all 19 declared claim commands, and the dependency audit.
- The complete free sample and real workflows, checksum match, invalid-input
  recovery, 25,000-row boundary check, real/demo data separation, and offline
  reload.
- Fresh desktop and 390 px phone structure, keyboard focus, reduced motion,
  settled Axe scans, route titles, legal pages, security headers, and the
  designed expected HTTP 404.
- All 22 public `dist/` files match live HTTPS byte-for-byte.
- Lighthouse mobile: 100 Performance, 100 Accessibility, 100 Best Practices,
  and 100 SEO; FCP 0.9 s, LCP 1.1 s, TBT 0 ms, CLS 0.
- Product-specific rate-limit probe: one 200 and 79 429 responses; every 429
  included `Retry-After`.

## Verification commands

From a clean checkout:

```sh
npm ci
npm test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
npm audit --audit-level=high
```

Run every `test` value in `.factory/claims.json` individually. Use
`scripts/verify-url.sh` against `/`, `/demo`, `/privacy/`, `/terms/`, and an
unknown route. The implementation has no backend or installed CLI artifact.

## Evidence files

- Repository report: `.factory/verification-5.md`
- Copied report: `/work/.evidence/qa-report.md`
- Machine result: `/work/.evidence/qa-result.json`
- Desktop, phone, demo, and 200% text screenshots: `/work/.evidence/itl-verify5-*.png`
- Lighthouse JSON: `/work/.evidence/itl-verify5-lighthouse.json`
