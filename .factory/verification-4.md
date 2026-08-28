# Import Transform Ledger — independent product verification 4

## Verdict: PASS

Candidate `e08cd528ffddddc572cabbb767bf74f85a17e7ff` satisfies the researched
brief and the verification work order. The deployed PWA is byte-identical to
the candidate production build, the complete local CSV workflow works, and no
release-blocking defect was found.

- Tested commit: `e08cd528ffddddc572cabbb767bf74f85a17e7ff`
- Tested URL: <https://import-transform-ledger.sociobot.in>
- Verification time: 2026-08-28 08:44–08:53 UTC
- Environment: Node 22.23.2, npm 10.9.8, Playwright 1.58.2 Chromium,
  axe-core 4.13.0, Lighthouse 13.4.1.
- Started on a clean, unchanged checkout at the candidate. Product code was
  not modified.

## Repository gates

| Check | Result | Evidence |
| --- | --- | --- |
| Clean dependency install | PASS | `npm ci`: 60 packages installed; 0 vulnerabilities |
| Unit/config tests | PASS | `npm test`: 17/17 tests passed |
| Type check | PASS | `npm run typecheck` (`tsc --noEmit`) |
| Available lint | PASS | `npm run lint` (`tsc --noEmit`) |
| Exact production build | PASS | `npm run build` produced `dist/` and completed the closed-billing exclusion check |
| Browser integration tests | PASS | `npm run test:e2e`: 9/9 Playwright specs passed against the built artifact |
| Dependency audit | PASS | `npm audit --audit-level=high`: 0 vulnerabilities |
| Diff hygiene before report edits | PASS | `git diff --check` |

The built JavaScript is 35,534 B (11,550 B gzip), CSS is 17,943 B (4,570 B
gzip), there are no font files, and the mobile AVIF is 25,767 B. All are under
the stated PWA budgets.

## Independent end-to-end exercise

On the live deployment at desktop width, I imported a Windows-1252 source with
`Café`, quoted pound currency, leap day, impossible date, malformed number,
blank required date, trimmed whitespace, and a duplicate ID. I manually mapped
the target headers, selected D/M/Y date and number transforms, made ID/date/
amount required, and deduplicated by ID.

- Result was exactly 6 input, 2 ready, 4 rejected, and 1 duplicate.
- The ready output included normalized `2024-02-29`, `1234.5`, preserved
  Windows-1252 text, and trimmed fields.
- Rejections explicitly identified source row 3 impossible date, row 4 bad
  number, row 6 duplicate of source row 2, and row 7 required blank date.
- The downloaded recipe SHA-256 exactly matched the checksum report's
  `sha256.recipeJson`.
- I exported the example recipe, opened a clean browser context, imported it,
  and reran it on a new source. It yielded one ready row with `Ada Lovelace`,
  `ada@example.com`, `2024-02-29`, and `EAST`, without remapping.
- Builder integration coverage also passed malformed JSON, corrupt/undeclared
  recipe mappings, over-wide CSV rows, workspace persistence, deletion/reset,
  and recovery paths.

## Live deployment, privacy, and policies

All 19 browser-served files from `dist/` match the live origin byte-for-byte;
the build-control file `/staticwebapp.config.json` correctly returns 404.
Representative root SHA-256 is
`0cfafcb4d5983c89e52db4d2b3ec1d2551b717587a50a2344ebbaccd5a1a9e70` both
locally and live. Root, legal pages, manifest, service worker, and offline page
return 200.

- Hashed JS and artwork are `max-age=31536000, immutable`; service worker is
  `no-cache, no-store, must-revalidate`; manifest is
  `application/manifest+json`.
- Live responses provide HSTS (one year plus preload), CSP with self-only
  scripts/styles/images and the documented billing connect source, frame
  denial, `nosniff`, strict referrer policy, and Permissions-Policy.
- The complete free workflow generated no external browser requests, analytics,
  tracking, third-party fonts, or scripts. CSV values appeared in neither URLs
  nor request bodies. Active workspace/recipes/runs are local IndexedDB data.
  The closed build exposes neither checkout nor a license token input and
  strips an unexpected `?license=` without storing or transmitting it.
- There is no sign-in flow or identity provider.

## PWA, accessibility, and responsive evidence

- Chromium accepted the live manifest and the live service worker controlled
  the page. At 390x844, a true offline reload restored the shell, retained no
  page-width overflow, and visibly showed `Offline · tools ready` plus the
  detailed local-tools offline status. No console/page error occurred.
- The integration suite independently exercised a changed service-worker
  version, update toast, reload/activation, and subsequent offline reload.
- At both desktop and 390 px, axe found zero serious or critical findings on
  home, transformed review, privacy, and terms states. The live mobile keyboard
  check found the skip link first, Enter moved focus to `main`, the focus style
  was visible, and reduced motion computed to `0s`. The 390 px viewport had
  zero horizontal overflow.
- Fresh live mobile Lighthouse: Performance 100, Accessibility 100, Best
  Practices 100, SEO 100; FCP 1.1 s, LCP 1.1 s, TBT 10 ms, CLS 0, 45 KiB total
  transfer. The Lighthouse console-errors audit passed.
- Visual review at 1440 px and 390 px found the declared paper/ledger visual
  system intact, no clipping, and no generated-art text, watermark, brand, or
  people artifacts.

## Server endpoint rate limit

Although the deployed closed build has no active server-side product endpoint,
I also tested the documented Sociobot license verification endpoint directly:
`GET https://api.sociobot.in/api/v1/products/import-transform-ledger/verify`.
An 80-request invalid-token burst at concurrency 16 completed in 421 ms with
30 HTTP 200 responses followed by 50 HTTP 429 responses. Every 429 in that
burst contained `Retry-After: 4`; rate limiting therefore began after 30
accepted requests in the observed burst. A later serial probe remained limited
and still supplied the `Retry-After` header. This satisfies the work-order
rate-limit requirement.

## Defects

None found. No package/CLI consumer test applies to this static PWA.

## Release decision

**PASS — release-ready.**
