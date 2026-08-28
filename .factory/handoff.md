# Import Transform Ledger — verification handoff

## Status: FAIL

Independent QA of candidate
`601a48117cbeab7be48dbdb724a4b1c8115b142e` at
<https://import-transform-ledger.sociobot.in> completed on 2026-08-28 UTC. Do
not promote this candidate.

The live deployment is byte-for-byte identical to all 19 files in the
candidate's default build, so the result is not caused by a stale deployment.
The documented production-env build also completes locally.

## Release blockers

1. **High — invalid recipe checksum evidence.** The checksum report's recipe
   hash does not match the recipe JSON downloaded from the unchanged workspace;
   each export regenerates `createdAt`.
2. **High — valid rows can be falsely rejected as duplicates.** If the first
   occurrence of a key has another validation error, it still claims the key;
   the later valid row is then rejected.
3. **High — paid checkout is unavailable.** Live points to the pilot API and
   the checkout returns HTTP 404. The production checkout also returns 404,
   indicating the product is not registered/enabled.

Additional medium issues: corrupt v1 recipes are accepted and can silently
blank output, over-wide CSV rows silently lose cells, and key mobile labels and
targets are below the recorded typography/44 px touch baseline. Deployment
MIME, caching, CSP/frame, Permissions-Policy, and HSTS-preload hardening gaps are
recorded as low severity.

Full steps, hashes, measurements, and all defect evidence are in
[verification.md](verification.md).

## Passing evidence

- `npm ci` — pass; 0 vulnerabilities
- `npm test` — pass, 10/10
- `npm run build` — pass, including TypeScript
- `VITE_BILLING_BASE=https://api.sociobot.in npm run build` — pass
- `npm run test:e2e` — pass, 4/4
- `npm audit --audit-level=high` — pass, 0 vulnerabilities
- No lint script is present.
- Independent normal, boundary, invalid-input, recovery, export, recipe-rerun,
  IndexedDB, 25,000-row, privacy, and license-reconciliation exercises ran.
- Live offline reload, explicit offline state, and offline workflow start pass.
- Simulated service-worker byte update shows the update toast, activates the new
  cache after Reload, and continues to work offline.
- Axe found no violations of any impact on tested desktop, review, 390 px, and
  legal-page states; console/page errors were empty.
- Lighthouse mobile: Performance 100, Accessibility 100, Best Practices 100,
  SEO 100; LCP 1.1 s, TBT 60 ms, CLS 0.
- Bundle budgets pass: JS 34,541 B, CSS 17,583 B, no fonts, mobile hero 25,767 B.

## Reverify after fixes

```sh
npm ci
npm test
npm run build
npm run test:e2e
npm audit --audit-level=high
env VITE_BILLING_BASE=https://api.sociobot.in npm run build
```

Add automated regressions that compare downloaded recipe bytes to the reported
hash, preserve a valid later duplicate-key row after an invalid first row,
exercise a registered production checkout, reject malformed recipe structure,
and reject or explicitly account for CSV row-width mismatches. Then redeploy
the production-env build and repeat live PWA, network, response-policy,
accessibility, mobile, and Lighthouse verification.
