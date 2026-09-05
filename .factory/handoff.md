# Import Transform Ledger — repair 3 handoff

## Status: release-ready

- Implementation and deployed artifact: `8bf83ab` (`fix: add isolated demo and
  verifiable release routes`)
- Documentation/report record: `2604f85cdf6ddac42ea079a24a366d8775273d3b`
  (created after deployment; it contains no product artifact change)
- Previous review/report baseline: `3075a19`
- Deployment: 2026-09-05 UTC to
  <https://import-transform-ledger.sociobot.in>
- This handoff is a documentation-only follow-up to the implementation commit;
  no product image was rebuilt after the deployment candidate.

## Job, audience, and first action

The product maps, cleans, validates, and documents CSV imports with a reusable
recipe and a rejection record. It is for implementation consultants and
operations staff preparing supplier or legacy data for business systems.

On fresh desktop and 390 px phone contexts, before scrolling, the page states:

- Job: **Clean and document CSV imports**
- Audience: implementation consultants and operations staff
- First action: **Try it with sample data**; it loads five rows with mappings,
  rejects, and exports.

Both fresh live contexts showed these elements. The phone page had matching
`scrollWidth` and `clientWidth` of 390 px.

## Repairs completed

| Review finding | Disposition | Evidence |
| --- | --- | --- |
| ITL-R1-001 isolated demo | Resolved | `/demo` and `?demo=1` load a five-row sample in the separate `import-transform-ledger:demo` IndexedDB database. The banner has Reset demo and Start for real. `@claim:demo-isolation` creates a real workspace, resets/exits demo, then confirms the real row remains. [.factory/demo.md](demo.md) documents the boundary. |
| ITL-R1-002 claims ledger | Resolved | [.factory/claims.json](claims.json) lists 19 public claims. Each has exactly one `@claim:` outcome test. All 19 declared individual commands were run against the built artifact. |
| ITL-R1-003 plain first screen | Resolved | The headline, audience sentence, sample action help, and three privacy/offline/free facts meet the first-screen contract. [.factory/copy-audit.md](copy-audit.md) records sentence counts and product terminology. |
| ITL-R1-004 real 404 | Resolved | `staticwebapp.config.json` uses a 404 response override to the styled `404.html`. Live `/not-a-real-page` returned HTTP 404 with title, h1, and workspace recovery link. |
| ITL-R1-005 route metadata and skeleton | Resolved | Home, demo, privacy, terms, and 404 now have titles and appropriate metadata; legal pages use the shared wordmark/header/footer pattern; sitemap includes `/demo`; a 1200×630 product-art social image and Apple touch icon are shipped. |

Earlier findings remain covered: checksum recipe hashes match the downloaded
bytes; invalid rows cannot claim a dedupe key; corrupt recipes and uneven rows
are rejected; mobile targets remain 44 px; response policies and offline mobile
state are present; and the closed billing build exposes no invalid checkout.
The external license API’s observed 429/Retry-After result remains recorded in
verification 4; no backend is part of this static product.

## Verification

Started with the documented clean setup: `npm ci` completed with 0
vulnerabilities.

| Command or check | Result |
| --- | --- |
| `npm test` | PASS — 17 unit/config tests |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS — `dist/` produced |
| `npm run test:e2e` | PASS — 29 Playwright checks, including all claims |
| Each of the 19 `claims.json` `test` commands | PASS individually against the built artifact |
| `npm audit --audit-level=high` | PASS — 0 vulnerabilities |
| `scripts/verify-url.sh` on local `/`, `/demo`, legal routes, and 404 | PASS — one title, one h1, one main, `lang=en`, image alts, no actionable console errors |
| Playwright Axe checks | PASS — no serious or critical violations on home/demo and legal routes |
| Link crawl | PASS — all same-origin destinations returned 200; mail links and in-page anchors were explicit |
| Local Lighthouse mobile | 100 Performance, 100 Accessibility, 100 Best Practices, 100 SEO; FCP 1.2 s, LCP 1.5 s, TBT 20 ms, CLS 0 |

The standalone Axe CLI could not find a Chrome binary in this worker even when
given the Playwright browser path. The repository’s Playwright Axe integration
ran successfully and is the applicable alternate check.

Build output: JavaScript 39,246 B (12,442 B gzip), CSS 19,678 B (4,888 B
gzip), no font payload, and mobile hero AVIF 25,767 B. All are within the PWA
budgets.

## Live checks

The static deployment completed successfully. A recursive comparison of every
public `dist/` file except the deployment control file
`staticwebapp.config.json` against the HTTPS origin was byte-identical.

Fresh HTTPS checks passed for `/`, `/demo`, `/privacy/`, `/terms/`, and the
expected HTTP 404. No console or page errors occurred. The live demo displayed
the persistent banner and realistic populated output: 5 input, 2 ready, 3
rejected, and 1 duplicate. Reset demo reported that real data was unchanged. A
fresh real workspace with `LIVE-42` remained available after leaving the demo.

The service-worker claim suite uses a dedicated browser context, verifies an
offline reload after first visit, and verifies the update toast after serving a
new worker. The privacy claim records requests through the demo flow and finds
same-origin GET requests only; it also checks that no cookie is set.

## Known dependency and next step

Field Kit remains an honest closed offer until the factory billing-registration
operator enables it. The free transform, review, export, and recipe JSON paths
remain complete. The public offer metadata is recorded at
`/work/.evidence/billing-offer.json`; it contains no credential. The catalog
description is at [.factory/catalog-description.txt](catalog-description.txt)
and copied to `/work/.evidence/catalog-description.txt`.
