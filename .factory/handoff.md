# Import Transform Ledger — repair handoff

## Status: DEPLOYED

Repair work for verifier report commit
`4cd3bc2b3d534592a00ac55b9477b353548fefcb` against candidate
`213a046051723b52b81fba940b9c3b5b3aa95134` is complete. The product remains a
Vite + TypeScript local-first PWA, deployed as a static artifact with
`dist/index.html` at its root.

Repair commit `0cc6b7de159dd21ee85aebef6feaac07585a45e4` was pushed to
`origin/main` and deployed to
<https://import-transform-ledger.sociobot.in> on 2026-08-28 UTC.

## Findings repaired

### ITL-QA-008 — exposed unthrottled license verification

The verifier's direct replay was reproduced before repair: 80 distinct invalid
tokens returned 80 HTTP 200 responses, no `Retry-After`, in 579 ms. That
endpoint belongs to the external Sociobot billing service; this static product
cannot implement its server policy, and repository rules prohibit changing
billing infrastructure here.

The actual product defect was that a closed-purchase build still exposed the
restore control and could invoke that external endpoint. Closed builds now:

- render neither checkout nor license-restore controls;
- strip an unexpected `?license=` value without storing or transmitting it;
- compile out the billing API and verification path; and
- fail `npm run build` if the closed JavaScript contains the billing origin,
  verification route, or license input marker.

For a future factory-approved `VITE_BILLING_ENABLED=true` build, all foreground
and return-token verification is serialized, limited to one attempt per device
per 30 seconds, and respects a longer server `Retry-After`. A focused enabled
build test returned a mocked `429 Retry-After: 45`, displayed the 45-second
notice, and made one request after two immediate token submissions. The unit
regression models the verifier's exact 80-attempt burst and admits one attempt.

The external API itself still returns 200 to an unauthenticated direct burst.
Factory billing must add server-side throttling before enabling purchases; the
deployed closed build has no path to that endpoint. This is a prerequisite for
a future paid launch, not an exposed path in this release.

### ITL-QA-009 — hidden 390px cold-offline state

The initial status now derives from `navigator.onLine`, and asynchronous
workspace restoration cannot overwrite the offline message. At 390 px, the
always-visible header changes from “Runs locally” to “Offline · tools ready”; the
status live region also says that the workspace, recipes, transforms, and
exports remain available. This covers both empty and restored cold starts.

The exact regression uses a 390×844 context, waits for service-worker control,
goes offline, reloads cold, and asserts the header, detailed status, and 390 px
document width.

## Verification evidence

Run from a clean install after the final changes:

```sh
npm ci
npm test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
npm audit --audit-level=high
```

- `npm ci`: 60 packages installed; 0 vulnerabilities.
- Unit/config: 17/17 passed, including the 80-attempt throttle and numeric/date
  `Retry-After` cases.
- Playwright 1.58.2 Chromium: 9/9 passed. Coverage includes the full CSV and
  artifact workflow, checksum identity, corrupt input recovery, IndexedDB
  restoration, 390 px cold-offline reload, service-worker update activation,
  mobile targets, closed billing, keyboard focus, reduced motion, axe, legal
  pages, and same-origin privacy.
- Typecheck and lint passed (`tsc --noEmit`); dependency audit and
  `git diff --check` passed.
- Production build passed with `dist/index.html`; closed-build endpoint
  exclusion passed. A separate billing-enabled production build also passed.
- Worker URL verification passed locally and live: HTTP 200, title, `lang=en`,
  one `h1`, `main`, image alt attributes, labelled buttons, and zero console or
  page errors at desktop and 390 px.
- Playwright axe 4.13.0 reported zero violations on the live home, privacy, and
  terms pages and zero serious/critical findings throughout the local suite.
- Keyboard smoke test passed live: the skip link receives first focus and moves
  focus to `main`. Reduced-motion behavior is covered in the local suite.
- Live Chromium reported no manifest errors. The service worker controlled the
  page; a true offline reload at 390×844 showed “Offline · tools ready,” the
  detailed offline status, `navigator.onLine === false`, no horizontal
  overflow, and no console error. The update toast/activation/offline cycle
  passed locally.
- Visual inspection at 1440 px and 390 px found no clipping, overflow, or
  regression to the recorded editorial ledger visual system. No new imagery was
  created.
- Lighthouse 12.8.2 mobile: local **100/100/100/100** and live
  **100/100/100/100** (Performance/Accessibility/Best Practices/SEO). Live FCP
  0.9 s, LCP 1.1 s, TBT 0 ms, CLS 0, Speed Index 0.9 s, total transfer 45 KiB.
- Build budgets: JavaScript 35,534 bytes / 11,550 bytes gzip; CSS 17,943 bytes /
  4,570 bytes gzip; no fonts; mobile AVIF 25,767 bytes.
- Package/consumer verification is not applicable to this static PWA.

## Live identity, privacy, and response policy

All 19 public files in `dist/` match the live origin byte-for-byte; the build
control file correctly returns 404. Representative SHA-256 values are:

- `index.html`: `0cfafcb4d5983c89e52db4d2b3ec1d2551b717587a50a2344ebbaccd5a1a9e70`
- JavaScript: `1737d46bc746f2ffda0315a5a52011633e0d15be0f1595c02593a675131834f9`
- CSS: `0cb0b312a809b1b6b01f8346e98983c2b409ff26024ab291cdeb5e243e477e51`
- service worker: `3a4ebf3a485af28fe167d0952b7fb827902d1394a2f03a69a1dcb68ad8b8a5ba`

Root, privacy, terms, service worker, manifest, application assets, and AVIF
return 200. The manifest is `application/manifest+json`, AVIF is `image/avif`,
hashed assets are one-year immutable, and the service worker is `no-store`.
CSP, frame denial, Permissions-Policy, `nosniff`, strict referrer policy, and
one-year HSTS are present.

The live closed build made no external request during the free workflow or a
stray license-return probe. It contains no analytics, trackers, third-party
font/script request, checkout link, restore control, or billing endpoint. CSV
content remains local; workspace/recipes/runs remain in IndexedDB. The privacy
and terms pages now distinguish closed builds from future enabled billing.

## Deploy again

```sh
npm ci && npm test && npm run build
/opt/fleet/lib/deploy-static.sh import-transform-ledger /work/repo/dist
```

## Next step

Before the factory enables `VITE_BILLING_ENABLED=true`, add and independently
verify server-side rate limiting on the Sociobot verification API, including
`429` and `Retry-After` under the verifier's 80-request/concurrency-16 burst.
