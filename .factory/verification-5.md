# CSV import mapping, cleanup, and audit — verification 5

## Verdict: FAIL

Candidate `8bf83abaf06637189a40f385459b4bf9814e4fe6` does not meet the
zero-finding verification contract. The deployed free CSV workflow is useful,
fast, isolated from real data, and byte-identical to the candidate build. Three
acceptance findings remain, including three public statements without complete
declared outcome tests.

- Live URL: <https://import-transform-ledger.sociobot.in>
- Verified: 2026-09-06 UTC
- Implementation candidate: `8bf83abaf06637189a40f385459b4bf9814e4fe6`
- Repair handoff commit: `2604f85cdf6ddac42ea079a24a366d8775273d3b`
- Documentation baseline at review start:
  `83d91f201262afa96cc458d03f66fbbc50a714f9`
- Product code was not modified.
- Finding count: **3**
- Untested public claim count: **3**

## Job, audience, and first action

The job is to map, clean, validate, and document CSV imports with a reusable
recipe and explicit rejection records. The audience is implementation
consultants and operations staff preparing supplier or legacy data.

Before scrolling, fresh 1440×900 desktop and 390×844 phone sessions showed:

- Job: **Clean and document CSV imports**
- Audience: **For implementation consultants and operations staff preparing
  supplier or legacy data.**
- First action: **Try it with sample data**
- Action result: **Loads five rows with mappings, rejects, and exports.**
- Facts: CSV data stays on this device; offline after the first visit;
  transform, review, and export are free.

All items were inside the initial viewport. The phone document width was
exactly 390 px. The title names the job, and the first screen uses plain words.

## Findings

### Medium — ITL-V5-001: A normal demo exit retains modified demo data

The isolated database protects real data, but the required discard behavior is
incomplete. In a fresh live phone context:

1. Open `/demo` and replace the sample with `demo-marker.csv`.
2. Use the standard **Import Transform Ledger** wordmark to open `/`.
3. Open `/demo` again.

The demo restored `demo-marker.csv` and reported “Restored sample data in this
demo.” The `import-transform-ledger:demo` database had not been cleared.
**Start for real** does clear the database, and **Reset demo** safely reloads
the sample, but those are not the only visible ways to leave `/demo`.

This conflicts with the demo-sandbox requirement that leaving demo mode
discards demo data. It also makes this public privacy statement false for the
wordmark exit: “Demo data uses a separate browser database and is cleared when
you leave the demo.” No declared claim command covers discard on every exit.

Required repair: clear the demo namespace on every exit from demo mode, or
remove navigation paths that leave without the explicit safe exit. Add one
claim entry and outcome test that changes demo data, leaves through each visible
exit, returns, and observes the original sample.

### Medium — ITL-V5-002: Several phone links have targets below 44 px

The repaired mapping checkbox and app footer targets pass, but the 390 px live
site still has interactive targets below the attached 44×44 px baseline.
Measured browser boxes include:

| Route and control | Measured box |
| --- | ---: |
| `/` workspace **Try it with sample data** link | 350×24.8 px |
| `/` **Read the privacy policy** link | 187.5×19 px |
| `/privacy/` contact link | 171.9×20 px |
| Legal footer **Privacy** link | 50.7×16 px |
| Legal footer **Terms** link | 41.2×16 px |
| 404 **Open the workspace** link | 175.1×20 px |

These are real visible links, not clipped file inputs with separate 44 px
labels. Keyboard focus remains visible and Axe reports no serious or critical
violation, but those results do not replace the explicit touch-target check.

Required repair: give every visible link and button a 44 px minimum hit area on
the app, legal pages, and 404 page. Add a phone test that checks every visible
interactive target rather than selected controls only.

### Medium — ITL-V5-003: Two more privacy statements lack claim entries and outcome tests

The privacy page makes two testable storage claims that do not appear in
`.factory/claims.json`:

1. Local run reports are stored in IndexedDB.
2. The service worker does not cache CSV uploads or exported files.

Independent live inspection found one checksum run in the demo `runs` object
store and found only application-shell URLs in Cache Storage. The statements
are true in the observed session, but source inspection or one manual check is
not the required repeatable claim evidence. Neither statement has a unique
`@claim:` outcome test or declared command.

Required repair: add one claim entry and one outcome test for each statement,
or remove/narrow the public copy. The cache test must inspect Cache Storage
after upload and export; the run-report test must inspect the correct isolated
IndexedDB namespace after the observable action.

## Declared claim commands

The candidate lists 19 claims with 19 unique IDs, commands, and test tags. Each
declared command was run individually from a detached clean checkout after
`npm ci` and `npm run build`.

| Claim ID | Result | Observed outcome |
| --- | --- | --- |
| `local-processing` | PASS | Five input rows produced two ready and three rejected rows. |
| `csv-private` | PASS | Export flow sent same-origin GET requests only. |
| `offline-reload` | PASS | A dedicated phone context reloaded `/demo` offline. |
| `csv-encodings` | PASS | UTF-8 and Windows-1252 values decoded correctly. |
| `delimiter-detection` | PASS | Semicolon and tab fixtures parsed correctly. |
| `exact-header-mapping` | PASS | Only the exact `Name` header was preselected. |
| `deterministic-transforms` | PASS | Reset reproduced the same normalized values. |
| `duplicate-detection` | PASS | The transformed duplicate had an explicit source row. |
| `rejection-reasons` | PASS | All three rejected sample rows had reasons. |
| `csv-exports` | PASS | Ready and rejection downloads had expected content. |
| `recipe-rerun` | PASS | Exported readable JSON imported and reran the sample. |
| `checksum-report` | PASS | Report recipe SHA-256 matched downloaded recipe bytes. |
| `local-persistence` | PASS | Demo workspace and saved recipe survived refresh. |
| `free-workflow` | PASS | Ready/rejection exports worked without purchase controls. |
| `free-recipe-json` | PASS | Recipe import/export worked without purchase controls. |
| `field-kit-offer` | PASS | The closed $29 offer was stated without checkout. |
| `no-third-party-runtime` | PASS | No tracker, cookie, external font, or external script loaded. |
| `offline-update` | PASS | A changed worker produced the reload notice. |
| `demo-isolation` | PASS | Reset and **Start for real** did not alter real data. |

The three untested public statements in ITL-V5-001 and ITL-V5-003 are outside
this otherwise passing ledger. A passing declared set does not make unlisted
claims pass.

## Clean-checkout gates

The clean checkout was detached at the implementation candidate.

| Check | Result |
| --- | --- |
| `npm ci` | PASS — 60 packages; 0 vulnerabilities |
| `npm test` | PASS — 17 tests |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS — `dist/` produced |
| `npm run test:e2e` | PASS — 29 browser checks |
| All 19 individual claim commands | PASS — one test each |
| `npm audit --audit-level=high` | PASS — 0 vulnerabilities |
| `scripts/verify-url.sh` on `/`, `/demo`, legal routes, and 404 | PASS |

Build output remains within budget: JavaScript is 39,246 bytes (12.51 kB
gzip), CSS is 19,678 bytes (4.86 kB gzip), there is no font payload, and the
phone AVIF is 25,767 bytes.

## Live workflow and recovery evidence

- `/demo` showed its persistent sample label, `supplier-export.csv`, five input
  rows, two ready rows, three rejected rows, and one duplicate.
- A real `LIVE-VERIFY-5` row remained after demo reset and **Start for real**.
- The demo and real IndexedDB names were separately observed as
  `import-transform-ledger:demo` and `import-transform-ledger`.
- Downloaded recipe SHA-256
  `7e00a9c80a66db2b48213e7227de0f0e3e474529fa98bec96e270722b6436a2f`
  matched the checksum report.
- An unclosed quote, an over-wide row, a corrupt recipe mapping, and empty
  target columns each produced a specific recovery instruction. Opening the
  sample afterward restored a working review.
- A 25,000-row, two-column file reached review in about 2.5 seconds with
  25,000 rows and no page error. No public time claim is made from this check.
- `/?demo=1` and `/demo` both entered the isolated sample with the Demo title.

## Accessibility, phone, motion, and routes

Settled Playwright Axe scans found no serious or critical issues on fresh
desktop and phone home/demo states, export state, privacy, terms, and 404. The
first keyboard stop was the skip link with a 3 px visible focus ring; Enter
moved focus to `main`. Reduced motion produced `0s` transitions, `auto`
scrolling, and no running animation. A 200% root text-size check kept page
width at 390 px; the stage rail retained its intentional labelled horizontal
scroll. ITL-V5-002 remains because automated Axe does not enforce this
product's 44 px target baseline.

Home, demo, privacy, and terms returned HTTP 200 with distinct titles, one
`h1`, one `main`, `lang=en`, canonical metadata, social metadata, and working
same-origin links. The sitemap includes all four routes. The designed unknown
route returned the expected HTTP 404 with its own title, heading, and recovery
link. The 404 status is expected evidence, not an error.

## Offline, privacy, deployment, and performance

- A service-worker-controlled 390×844 demo reloaded offline with the sample,
  banner, and visible offline explanation.
- The complete live exercise made no external request and set no cookie.
- Live CSP, HSTS, frame denial, `nosniff`, referrer policy, permissions policy,
  manifest MIME type, immutable asset caching, and no-store worker caching were
  present.
- All 22 public files from `dist/` matched the live HTTPS bytes. The deployment
  control file was correctly excluded from public comparison.
- Lighthouse 13.4.1 mobile: **100 Performance, 100 Accessibility, 100 Best
  Practices, 100 SEO**; FCP 0.9 s, LCP 1.1 s, TBT 0 ms, CLS 0, 59 KiB.
- The product has no backend. Tenant health, tenant persistence, and product
  restart checks do not apply. A fresh product-specific license endpoint burst
  returned one HTTP 200 and 79 HTTP 429 responses; every 429 had
  `Retry-After`. The closed build does not call that endpoint.
- No AI step is missing. The brief specifically requires human-reviewed
  mappings and forbids sensitive semantic inference with an LLM.

## Earlier finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| ITL-QA-001 checksum mismatch | Resolved — live download hash matched. |
| ITL-QA-002 invalid row claims dedupe key | Resolved — exact unit regression passes. |
| ITL-QA-003 unusable paid checkout | Resolved honestly — closed build has no checkout. |
| ITL-QA-004 corrupt recipe accepted | Resolved — live corrupt mapping was rejected. |
| ITL-QA-005 over-wide CSV loses cells | Resolved — live row-width error prevents loss. |
| ITL-QA-006 phone labels and targets | **Partly open — see ITL-V5-002.** |
| ITL-QA-007 response policies and caching | Resolved — live headers and MIME pass. |
| ITL-QA-008 missing 429/`Retry-After` | Resolved — fresh burst returned both. |
| ITL-QA-009 hidden phone offline state | Resolved — visible on cold offline reload. |
| ITL-R1-001 isolated demo | **Partly open — see ITL-V5-001.** |
| ITL-R1-002 claim ledger | **Partly open — see ITL-V5-001 and ITL-V5-003.** |
| ITL-R1-003 first-screen words | Resolved — job, audience, action, and facts pass. |
| ITL-R1-004 real 404 | Resolved — expected styled HTTP 404 passes. |
| ITL-R1-005 route metadata and skeleton | Resolved — required live routes pass. |

## Release decision

**FAIL — 3 findings and 3 untested public claims.** Do not declare this
candidate accepted until every finding is repaired and all public claims have
their required declared outcome tests.
