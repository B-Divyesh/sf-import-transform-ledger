# CSV import mapping and audit trail — review 1

## Verdict: FAIL

The live product has a working local CSV transform workflow, but this review
finds five open contract defects and 17 untested public claims. It is **not a
PASS**.

- Live URL: <https://import-transform-ledger.sociobot.in>
- Reviewed: 2026-09-05 UTC
- Implementation candidate: `e08cd528ffddddc572cabbb767bf74f85a17e7ff`
  (`fix: close release-blocking offline and license paths`)
- Documentation/report commit at review start:
  `b21635a9fbf5b6e021c0185c30dbb4d1c5843b4b`
  (`docs: record verification 4 pass`)
- The current local production build is byte-identical to the live
  `index.html`, JavaScript, CSS, service worker, and manifest. The later
  commit is documentation-only, so `e08cd52` is the implementation reviewed.
- Product code was not modified.

## Job, audience, and first action

The job is to map, clean, validate, and document a CSV import with a rerunnable
recipe and a ledger of rejected rows. It is for implementation consultants and
operations staff preparing supplier or legacy data for a business system. On a
fresh desktop and iPhone 13 browser, the first visible action is **Start an
import**; the available sample action is labelled **Try the example**.

The page does not meet the required sample-first wording or sandbox behavior;
see ITL-R1-001 and ITL-R1-003.

## Findings

### High — ITL-R1-001: The one-click example is not an isolated demo sandbox

The product has no compliant demo entry point. Fresh `/demo` and `/?demo=1`
both render the ordinary empty workspace; neither enters sample mode nor has a
Demo-specific title. The visible **Try the example** button loads realistic
five-row data, but it writes to the ordinary `import-transform-ledger`
IndexedDB database. Reloading the same normal context restores the sample as
the active workspace. There is no persistent “Demo — sample data, nothing is
saved” label, no **Reset demo**, and no **Start for real** control.

This means the sample can overwrite the visitor's actual active workspace and
cannot be verified from the required clean `/demo` or `?demo=1` entry point.
The sample output itself is useful (5 input, 2 ready, 3 rejected, 1 duplicate),
but it does not satisfy the isolation contract.

Required repair: implement a direct demo URL, separate demo storage namespace,
persistent banner, reset/start-real controls, and `.factory/demo.md`; add an
end-to-end test proving demo activity cannot read or write real data.

### High — ITL-R1-002: Required public-claim ledger and claim tests are absent

`.factory/claims.json` is missing and the repository has no `@claim:` test
tags. Therefore no declared claim command can be run from a clean checkout.
The 17 discrete, visitor-reliant claims below are unlisted and untested under
the claims contract:

1. CSV processing happens in the browser/local device.
2. CSV data does not leave the browser.
3. The utility works offline after the first visit.
4. UTF-8 and Windows-1252 inputs are handled safely.
5. Delimiters are detected automatically.
6. Column mappings do not use semantic or LLM guessing.
7. Cleanup transforms are deterministic.
8. Duplicate detection works on transformed target fields.
9. Every rejected row has an explicit reason.
10. Ready and rejection CSV files export.
11. Recipe JSON is readable, diffable, and rerunnable.
12. The checksum report identifies the exported artifacts.
13. Saved recipes and the active workspace persist locally.
14. The full transform/review/export workflow is free.
15. Recipe JSON export/import remains free.
16. No analytics, tracking, third-party fonts, or third-party runtime scripts
    are used.
17. An offline update is offered when a new service worker is available.

Existing unit and Playwright tests cover portions of several items, but they
are not the required one-test-per-claim commands and cannot establish complete
claim coverage. Add the ledger, tag exactly one observable sandbox test per
claim, and remove or narrow any claim that cannot be tested.

### Medium — ITL-R1-003: The first screen and supporting copy do not follow the plain-words contract

The first screen uses the decorative eyebrow “A private customs desk for
unruly data,” which is metaphor/brand-lore copy. The heading “Make every CSV
import explain itself.” does not plainly name the job. The supporting sentence
does not name the intended consultants or operations staff. “Try the example”
does not say that it loads sample data or what the visitor will see next, and
the required three plain privacy/offline/price facts are not placed beside the
first action.

`.factory/copy-audit.md` is also absent, so the required sentence-count and
banned-word review cannot be reproduced. Rewrite the entry screen and legal
headings in plain words, add the required action help and facts, then commit
the copy audit.

### Medium — ITL-R1-004: Unknown routes do not have a designed 404 page

`GET /this-is-not-a-page` returns HTTP 200 and the normal homepage title and
workspace. The deployed static configuration has a universal navigation
fallback and no `responseOverrides` 404 rewrite or `404.html`. This is neither
a deliberate HTTP 404 nor a product-specific error page with a route back, as
required. Add a real styled 404 response and test the status, title, heading,
and recovery link.

### Low — ITL-R1-005: Required route metadata and consistent route skeleton are incomplete

The home, privacy, and terms documents have no canonical link, Open Graph
metadata, Twitter card metadata, or Apple touch icon. The legal pages also use
a different, reduced header rather than the required consistent header/nav.
The sitemap omits the required demo entry point. Add per-route metadata and
the shared navigation structure once the compliant demo route exists.

## Working evidence

### Runtime exercise

- Fresh desktop (1440 px) and iPhone 13 (390 px) pages loaded without console
  or page errors. The product rendered one `h1`, one `main`, `lang=en`, and the
  expected home title.
- The example flow was exercised through mapping, row rules, review, and
  populated output. It displayed 5 source rows, 2 ready rows, 3 rejected rows,
  and 1 duplicate. Review gave reasons for source rows 4, 5, and 6.
- Invalid empty target headers reported “Enter at least one target column,” and
  an unclosed quote reported the actionable closing-quote error. Loading the
  example immediately afterward recovered the workflow. A normal workspace
  persisted across reload.
- A 390×844 service-worker-controlled context reloaded offline without error,
  displayed the offline message, and had no horizontal overflow. The local
  suite also passed its deterministic service-worker update test.
- In a fresh example flow, observed browser requests were same-origin only.
  No external request, analytics, runtime font, or script request occurred.
- Links on home, privacy, and terms resolved successfully (same-origin links
  returned 200; the two contact links are explicit `mailto:` links).

### Accessibility and responsive checks

Live axe-core checks found zero violations on desktop home, 390 px home,
privacy, and terms. The first Tab stop was the skip link with a 3 px designed
focus outline; Enter moved focus to `main`. With reduced motion, the hero
transition was `0s` and document scrolling was `auto`. Desktop and 390 px
scroll widths equalled viewport widths. This passing evidence does not remove
the demo, claims, plain-words, or route findings above.

### PWA, privacy, and server scope

The manifest parsed, the service worker controlled the live app after reload,
and the mobile offline reload was usable. Content Security Policy, HSTS,
frame denial, `nosniff`, referrer policy, and permissions policy were present.
The product is a static PWA with no product backend; tenant isolation, restart
persistence, health endpoint, and live API rate-limit checks are not
applicable. The closed purchase build does not expose billing controls.

### Commands run from the clean checkout

| Command | Result |
| --- | --- |
| `npm ci` | PASS — 60 packages installed; 0 vulnerabilities |
| `npm test` | PASS — 17 tests |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS — produced `dist/` |
| `npm run test:e2e` | PASS — 9 Playwright tests |

README declares the commands above. Its optional development and preview
commands are not acceptance checks. No `.factory/claims.json` exists, so there
were no declared claim commands to run; that absence is ITL-R1-002, not a pass.
The prescribed `verify-url.sh` is also absent; equivalent live structural,
console, and axe checks were performed directly.

## Earlier findings disposition

| Earlier finding | Current disposition | Evidence |
| --- | --- | --- |
| ITL-QA-001 checksum mismatch | Resolved | The passing E2E flow downloads recipe and checksum report and compares SHA-256. |
| ITL-QA-002 invalid row consumes dedupe key | Resolved | `npm test` includes the valid-row-after-invalid-row case. |
| ITL-QA-003 unavailable paid purchase | Resolved honestly | The closed live build shows purchases are not open and renders no checkout/restore control. |
| ITL-QA-004 corrupt recipe accepted | Resolved | E2E rejects undeclared target/unsupported transform; unit validation tests pass. |
| ITL-QA-005 over-wide CSV truncation | Resolved | E2E and unit test reject the unaccounted field. |
| ITL-QA-006 mobile labels/targets | Resolved | Existing mobile E2E checks 14 px labels and 44 px targets; live 390 px has no overflow. |
| ITL-QA-007 response policies/caching | Resolved | Live headers include MIME, immutable hashed assets, CSP, frame denial, permissions policy, and one-year HSTS. |
| ITL-QA-008 rate limit | Previously resolved; no active product backend | Verification 4 records the external API 429/Retry-After burst. This closed static build cannot invoke it. |
| ITL-QA-009 hidden mobile offline state | Resolved | Fresh 390 px live offline reload visibly showed the detailed offline status. |

The earlier findings are repaired, but their previous PASS does not cover the
current mandatory demo, claims, plain-words, and route requirements.

## Release decision

**FAIL — do not declare PASS.**

Finding count: **5**. Untested public claim count: **17**.
