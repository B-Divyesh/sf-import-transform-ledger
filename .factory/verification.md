# Import Transform Ledger — independent product verification

## Verdict: FAIL

Candidate `601a48117cbeab7be48dbdb724a4b1c8115b142e` is not release-ready.
The free workflow, offline PWA, accessibility automation, performance budgets,
and recipe rerun path are substantially functional, but three high-severity
defects remain: an unusable paid checkout, a checksum report that cannot verify
the exported recipe, and dedupe logic that can reject a valid row after an
invalid row with the same key.

- Tested commit: `601a48117cbeab7be48dbdb724a4b1c8115b142e`
- Tested URL: <https://import-transform-ledger.sociobot.in>
- Verification time: 2026-08-28 05:33–05:43 UTC
- Environment: Node 22.23.2, npm 10.9.8, Chrome for Testing 145.0.7632.6
- Checkout started from a clean `main` at the candidate with no local changes.
- Product code was not modified.

## Defects

### High

#### ITL-QA-001 — checksum report does not verify the exported recipe

1. Run a five-row Windows-1252 import with trim, uppercase, leap-date,
   currency/number, required-field, and dedupe rules.
2. Export the recipe JSON.
3. Export the checksum report JSON without changing the workspace.
4. SHA-256 the downloaded recipe and compare it with
   `report.sha256.recipeJson`.

Observed report hash:
`94a4199d9cfe29a799bb7d4a6360c439fed03d33a9a0d2619a4f188a458dd8af`.
Observed exported recipe hash:
`56501eca70345b9564b17716ad21852ce0b8fec109a42684169c3f2c46813560`.
The ready and rejection CSV hashes matched their downloads exactly. The recipe
hash differs because each call constructs a new recipe with a new `createdAt`,
so the report hashes a recipe artifact the user never receives. This breaks the
product's core audit/handoff claim.

#### ITL-QA-002 — dedupe can discard the only valid row for a key

Input:

```csv
id,date
A,31/02/2024
A,29/02/2024
```

Map both fields, normalize the date as D/M/Y, require both fields, and dedupe on
`id`. Expected: row 2 rejected for its impossible date and row 3 accepted.
Observed metrics: 2 input, **0 ready**, 2 rejected, 1 duplicate. The ledger says
row 3 is `Duplicate of source row 2 by id`, even though source row 2 was already
rejected. The UI promise that the first occurrence stays in the ready file is
also false in this case. A valid business record is unnecessarily excluded.

#### ITL-QA-003 — advertised $29 purchase flow is unavailable on production

The live buy link points to the staging origin:

`https://pilot-api.sociobot.in/api/v1/products/import-transform-ledger/checkout`

Fresh GET at 2026-08-28 05:34 UTC returned HTTP 404:
`{"error":"enabled factory product","status":404}`. The production-origin
checkout returned the same 404, so the slug is not enabled there either. The
live bundle was built without the documented production billing environment
variable, and product registration is also incomplete. Invalid-license and
return-token reconciliation work, but no user can complete the advertised
one-time purchase.

### Medium

#### ITL-QA-004 — corrupt version-1 recipes pass validation and silently alter output

A recipe with `targetHeaders: ["id"]` but a mapping targeting `"wrong"` and an
unknown transform `"bogus"` is accepted with the success message “Imported
recipe ‘Corrupt’.” After loading source `id\nA`, review reports 1 ready row but
shows the `id` value as `blank`. Recipe validation checks only the top-level
schema/version and presence of two arrays; it does not validate required fields,
mapping types, supported transforms, target coverage, or dedupe keys. Invalid
recipes should be rejected with an actionable error rather than produce a
plausible but wrong import.

#### ITL-QA-005 — over-wide CSV rows silently lose cells

With `id,name\n1,A,UNACCOUNTED\n2,B`, the app reports “2 rows, 2 columns,” accepts
both rows, and shows no warning or rejection for `UNACCOUNTED`. A malformed row
with more fields than its header is silently truncated, which is unsafe for an
audit-oriented transform utility. Row-width mismatches should be surfaced or
rejected with source-row reasons.

#### ITL-QA-006 — mobile labels and interactive targets miss the stated baseline

At 390 px, mapping labels compute to 11 px, required-field labels to 12 px, and
footer links to 13 px, below the 14 px annotation scale recorded in the visual
thesis and the attached legibility baseline. Each critical “Reject when blank”
label is only 26 px high; footer links are 15 px high (for example Terms is
38.3×15 px), below the required 44×44 CSS-pixel touch target. The primary
buttons are at least 44 px, the page has no viewport overflow, and axe does not
flag these sizing issues, but touch and low-vision usability remain below the
acceptance contract.

### Low

#### ITL-QA-007 — deployment policy and caching hardening gaps

- `manifest.webmanifest` and AVIF files are served as
  `application/octet-stream`; Chromium still parsed the manifest and reported
  no installability error.
- All documents, the service worker, and static assets use
  `Cache-Control: public, must-revalidate, max-age=30`; there is no immutable
  long-lived asset policy. The service worker mitigates repeat-load cost.
- Responses include HSTS, `nosniff`, referrer policy, and DNS-prefetch policy,
  but omit CSP/frame-ancestors (or X-Frame-Options) and Permissions-Policy.
- HSTS advertises `preload` with `max-age=10886400`, shorter than the usual
  one-year preload requirement.

No sensitive CSV content was observed in any request, and these policy gaps did
not cause a functional browser failure during verification.

## Build and repository gates

| Check | Result | Evidence |
| --- | --- | --- |
| Clean install | PASS | `npm ci`; 58 packages installed, 0 vulnerabilities |
| Unit tests | PASS | `npm test`; 10/10 tests |
| Type check + candidate build | PASS | `npm run build`; `tsc --noEmit` and Vite 7.3.6 |
| Production-env build | PASS | `VITE_BILLING_BASE=https://api.sociobot.in npm run build` |
| Builder E2E | PASS | `npm run test:e2e`; 4/4 Playwright tests |
| Dependency audit | PASS | `npm audit --audit-level=high`; 0 vulnerabilities |
| Lint | N/A | no lint script or lint configuration is present |
| Output | PASS | `dist/index.html` plus complete static/PWA shell |

Build sizes: JavaScript 34,541 B (11.37 KB gzip), CSS 17,583 B (4.54 KB
gzip), no font payload, mobile AVIF hero 25,767 B. These are below the 200 KB
JS, 50 KB CSS, 120 KB font, and 300 KB hero budgets.

## Deployment identity and response evidence

Every one of the 19 files from the default candidate `dist/` was downloaded
from the live origin and compared recursively; `diff -qr` returned no
differences. Representative hashes:

- `index.html`: `b05d15abfcf3e8fec70f01863dae5b248a172c9f135876dccfac7deee146a5fc`
- `assets/app.js`: `4eb0604ea00d84ac2976c8eb3d64b1649482c5dd7f7851be74ff56c142d0bb0a`
- `sw.js`: `8f521715f8c28bef9097a43f62d22a2b2d0864e9963b661c228b5b48cdf8f8e3`

The live deployment therefore matches the candidate's default/staging build;
it is not stale. A production-env build passes locally but differs in its
billing base URL.

Live root, index, JavaScript, CSS, service worker, manifest, offline page,
robots file, privacy page, and terms page all returned HTTP 200 over HTTP/2.
JavaScript and CSS were Brotli-compressed when requested with `Accept-Encoding`.

## Independent product exercise

### Core workflow and recovery

- Custom Windows-1252 source: 5 rows, quoted currency, embedded newline,
  leap-day, two-digit year, negative decimal, invalid date, blank required
  field, and duplicate key.
- Result: 2 ready, 3 rejected, 1 duplicate. Ready and rejection CSV contents,
  header order, transformations, source row numbers, and explicit reasons were
  verified. The ready/rejection report hashes matched the actual downloads.
- Malformed unclosed-quote CSV, empty source, empty target headers, duplicate
  target headers, malformed JSON, and unsupported recipe version each produced
  an actionable visible error. Loading valid input afterward recovered.
- Exported recipe imported in a clean context. A next-run source with the same
  headers preserved all five reviewed mappings and produced transformed output
  without spreadsheet edits.
- One free recipe saved to IndexedDB and survived reload. Active workspace
  restoration also passed.
- A 25,000-row CSV completed through review in about 4.4 seconds with 25,000
  ready rows and no page error. Processing is still main-thread/in-memory and
  no loading state appears during a large synchronous recalculation.

### Privacy and network

- Initial load and the complete free import/export workflow made same-origin
  requests only; no analytics, fonts, runtime scripts, or tracking requests.
- Unique source values were absent from all observed URLs and request bodies.
- Workspace/recipes/runs were stored in IndexedDB. License token/verdict were
  stored in localStorage as documented.
- A return token was stored and removed from the address bar; an invalid token
  was reconciled to locked state without blocking the free workflow.
- Privacy and terms pages each had HTTP 200, `lang=en`, one `h1`, a `main`, no
  axe violations, and no console/page errors.

### PWA/offline/update

- Chromium parsed the manifest and returned zero installability errors despite
  the server MIME type.
- The live service worker controlled the page; a true offline reload restored
  the app and displayed “Offline · all local tools available.” The example
  workflow could start offline.
- A deterministic local server test changed only the served service-worker
  bytes from cache v5 to v6. The in-app update toast appeared, Reload activated
  `itl-shell-v6`, and the app reloaded offline afterward with no console error.

### Accessibility, responsive behavior, and errors

- Axe: zero serious/critical findings and zero findings of any impact on the
  desktop home, transformed review, 390 px app state, privacy page, and terms
  page.
- Keyboard: skip link was first focus, Enter moved to `#main`, and the next
  primary control had a visible 3 px mustard focus outline. Native controls
  remained operable and no trap was found.
- Reduced motion: computed transition/animation duration was 0 and smooth
  scrolling became `auto`.
- One `h1`, `main`, English language, descriptive title, and meaningful hero
  alt text were present. No console errors, page errors, or failed initial
  requests occurred.
- At 390 px and 320 px there was no page-level horizontal overflow; data tables
  and the stage route use labelled/internal scrolling as intended.
- Visual inspection at 1440 px and 390 px found coherent product-specific
  hierarchy and no image text artifacts, brands, people, or watermark.

## Performance

Lighthouse 12.8.2 mobile against the live URL at 2026-08-28 05:37 UTC:

- Performance: **100**
- Accessibility: **100**
- Best Practices: **100**
- SEO: **100**
- FCP: **1.0 s**
- LCP: **1.1 s**
- TBT: **60 ms**
- CLS: **0**
- Speed Index: **1.0 s**
- Total transferred payload: **57,618 B**

## Release decision

**FAIL. Do not promote this candidate.** Fix ITL-QA-001 through ITL-QA-003 and
add regression tests for their exact cases. ITL-QA-004 through ITL-QA-006
should also be resolved before claiming the factory definition of done.
