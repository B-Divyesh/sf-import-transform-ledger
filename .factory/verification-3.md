# Import Transform Ledger — independent verification 3

## Verdict: FAIL

Candidate `213a046051723b52b81fba940b9c3b5b3aa95134` is not release-ready under the
work-order acceptance contract. The deployed artifact matches this candidate,
and the complete free CSV workflow, privacy behavior, PWA shell, accessibility,
and performance checks pass. Two defects remain: the product's license
verification API did not rate-limit a rapid invalid-token burst, and a cold
offline reload does not visibly communicate offline state on the required
390px viewport.

- Tested commit: `213a046051723b52b81fba940b9c3b5b3aa95134`
- Tested URL: <https://import-transform-ledger.sociobot.in>
- Verification time: 2026-08-28 06:59–07:10 UTC
- Environment: Node 22.23.2, npm 10.9.8, Playwright 1.58.2 Chromium,
  Lighthouse 13.4.1.
- Started from a clean checkout at the candidate. `npm ci` installed 60
  packages with 0 vulnerabilities. Product code was not modified.

## Defects

### High

#### ITL-QA-008 — license verification endpoint has no observed rate limit

The application exposes the Sociobot product-unlock verification call when a
license token is pasted:

`GET https://api.sociobot.in/api/v1/products/import-transform-ledger/verify?license=…`

One invalid token returned `200 {"valid":false,"reason":"invalid"}` as
expected. A fresh burst of **80 distinct invalid-token requests at concurrency
16** returned **80 HTTP 200 responses** in 4.7 seconds. No response returned
`429` or `Retry-After`; hence the observed threshold is **not reached through
80 rapid requests**. The API sets `Cache-Control: no-store` and correctly
allows the product origin through CORS, but it fails the explicit work-order
requirement that an API burst start returning `429` with `Retry-After`.

This is an external factory API/configuration issue rather than local CSV
logic, but it is in the product's license-restore path and blocks PASS.

### Medium

#### ITL-QA-009 — 390px cold offline reload hides the offline state

After the live service worker controlled the page, I set the 390×844 context
offline and reloaded. The app shell and workspace loaded successfully, but the
status ribbon visibly reads `Ready. Files stay on this device.`. Its only
explicit offline text, `Offline · all local tools available`, is in
`.network-state`, whose computed display at this breakpoint is `none`.
`navigator.onLine` was false. A user opening the installed app cold while
offline therefore receives no visible offline state, contrary to the PWA
offline-state requirement. The normal online-to-offline event does show a
visible message, and desktop cold offline reload does show the network state.

## Passing evidence

### Repository and build gates

| Check | Result | Evidence |
| --- | --- | --- |
| Clean install | PASS | `npm ci`: 60 packages, 0 vulnerabilities |
| Unit/config tests | PASS | `npm test`: 15/15 assertions passed |
| Typecheck | PASS | `npm run typecheck` (`tsc --noEmit`) |
| Lint available | PASS | `npm run lint` (repository aliases `tsc --noEmit`) |
| Exact production build | PASS | `npm run build`; `dist/` produced |
| E2E suite | PASS | 9/9 Playwright specs: suite run passed specs 1–8 and the ninth same-origin/private spec was rerun independently and passed |
| Dependency audit | PASS | `npm audit --audit-level=high`: 0 vulnerabilities |
| Diff hygiene | PASS before report edits | `git diff --check` |

Build budgets pass: application JavaScript is 37,200 B / 12,036 B gzip, CSS
is 17,858 B / 4,560 B gzip, no fonts are shipped, and the mobile AVIF hero is
25,767 B. All are below the stated static/PWA budgets.

### Independent end-to-end exercise

Using the production build on desktop, I loaded a Windows-1252 source with
`Café`, pound currency, an embedded quoted newline, a leap-day, duplicate ID,
impossible date, and required blank. I manually selected D/M/Y date and number
transforms and an ID dedupe key. Result: one exact transformed ready row
(`Café`, `2024-02-29`, `1234.5`), three explicit rejections, including the
duplicate reason and source row. Ready CSV, rejection CSV, recipe JSON, and
checksum report downloaded correctly; an independent SHA-256 of the downloaded
recipe was `54f91e03b86012034fb19521da70f1a39e09a00f751afb4b1cc1fde4a92d105e`,
matching `report.sha256.recipeJson`.

The exported recipe was imported into a fresh browser context and rerun against
new source data without remapping; it retained date and numeric transforms.
An undeclared-target/unsupported-transform recipe was rejected with an
actionable message, after which a valid CSV loaded successfully. The built-in
E2E coverage also passed corrupt CSV width, persisted workspace, service-worker
update toast/activation, and offline continuation checks.

### Privacy, browser, and accessibility

- The complete free workflow made only same-origin browser requests; observed
  external request list was empty. Source values appeared in neither URLs nor
  request bodies. Source inspection finds no analytics, trackers, third-party
  fonts, or runtime scripts. IndexedDB holds workspace/recipes/runs; the
  optional license token/verdict use localStorage as documented.
- There is no sign-in or identity provider flow. The only external application
  endpoint is the documented Sociobot license verification endpoint, invoked
  only after an explicit token restore.
- Playwright axe 4.13.0 found zero violations, including zero serious/critical,
  on local and live desktop home, local and live 390px home, privacy, and terms.
  `html[lang=en]`, title, exactly one `h1`, `main`, legal pages, labels, and
  image alt text passed. Keyboard testing found the skip link first, a designed
  focus outline, no horizontal overflow at 390px, and `0s` motion under reduced
  motion. No console errors or page errors occurred during the custom workflow.
- Visual inspection at 1440px and 390px found the declared paper/ledger visual
  system intact, no clipping or page-width overflow, and no generated-image
  text, watermark, brand, or anatomy artifacts.

### PWA, deployment, policies, and performance

- Chromium reports the live manifest at `/manifest.webmanifest` with no parse
  errors and no installability errors. The live service worker controls the
  page. Live cold offline reload restored the application shell at 390px; see
  ITL-QA-009 for the missing visible offline indication.
- The live `index.html`, hashed app JavaScript, service worker, and the other
  19 browser-served candidate files compare byte-for-byte to local `dist/`.
  The sole non-public build-control file, `staticwebapp.config.json`, correctly
  returns 404 at the edge and was excluded from runtime identity.
- Live root, privacy, terms, service worker, and manifest return HTTP 200.
  Manifest MIME is `application/manifest+json`; assets are immutable; the
  service worker is `no-cache, no-store, must-revalidate`. CSP, HSTS (one year
  plus preload), `nosniff`, frame denial, strict referrer policy, and
  Permissions-Policy are present. The license API grants the product origin
  CORS and returns `Cache-Control: no-store`.
- Fresh mobile Lighthouse against the live URL: **96 Performance, 100
  Accessibility, 100 Best Practices, 100 SEO**; FCP 1.1 s, LCP 1.1 s, TBT
  240 ms, CLS 0, 45 KiB total transfer.

## Scope note

The deployed default build intentionally does not advertise checkout until the
factory billing product is registered. It presents an honest “Purchases are
not open” state while retaining the complete free workflow and JSON export;
this is not counted as a checkout failure in this verification. No package or
CLI consumer check applies to this static PWA.

## Release decision

**FAIL — do not promote.** Add effective API rate limiting (return `429` plus
`Retry-After`) to license verification and make cold offline state visibly
available at 390px, then rerun the exact burst and mobile offline checks.
