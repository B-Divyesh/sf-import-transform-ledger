# Import Transform Ledger — build handoff

## Delivered

- A complete five-stage workflow: load source and target CSVs, review explicit
  column mappings, apply deterministic transforms, choose compound dedupe keys,
  inspect ready/rejected rows, and export a handoff.
- UTF-8 auto-detection with safe Windows-1252 fallback; comma, semicolon, and tab
  delimiter detection; quoted cells, escaped quotes, BOM, and embedded newlines.
- Trim, upper/lowercase, D/M/Y and M/D/Y date normalization, numeric/currency
  cleanup, exact find/replace, default values, and required-field rejection.
- Every excluded row carries its original source row number and one or more
  explicit reasons. Duplicate rows identify the first matching source row.
- Ready CSV, rejection CSV, diffable v1 recipe JSON, recipe JSON import, and a
  checksum report covering normalized source, output, rejects, and recipe.
- IndexedDB workspace restoration, local recipe library, downloadable backups,
  installable manifest, versioned service worker, update toast, and tested
  offline reload behavior.
- Complete free workflow plus the $29 one-time Field Kit license flow: hosted
  Sociobot checkout, return-token capture, daily verification cache, offline
  cached verdict, paste-to-restore, and unlimited saved recipes when active.
- Static `/privacy/` and `/terms/` pages, responsive 390px layout, full keyboard
  controls, visible focus, reduced-motion fallback, and original generated art.

## Verification (2026-08-28 UTC)

- `npm test` — 10/10 unit tests pass.
- `npm run build` — passes; outputs `dist/index.html`.
- `npm run test:e2e` — 4/4 Playwright tests pass: complete example workflow and
  recipe download, IndexedDB refresh restoration, true offline reload, 390px
  mobile stacking, and axe serious/critical scan.
- `npm audit --audit-level=high` — 0 vulnerabilities.
- Lighthouse mobile against the production preview: Performance **100**,
  Accessibility **100**, Best Practices **100**, SEO **100**; FCP 0.9 s, LCP
  1.4 s, TBT 50 ms, CLS 0.
- Initial application payload: JavaScript 34.54 KB (11.37 KB gzip), CSS 17.58 KB
  (4.54 KB gzip). Hero: AVIF 26 KB mobile / 123 KB desktop; WebP 37 KB mobile /
  152 KB desktop; JPEG fallback 66 KB.
- Visual review completed at 1440px desktop and 390px mobile. The generated hero
  has no text artifacts, people, brands, watermarks, or misleading UI.

## Run and deploy

```sh
npm ci
npm test
npm run build
npm run test:e2e
```

Deploy `./dist`. For production billing, build with
`VITE_BILLING_BASE=https://api.sociobot.in`; staging intentionally defaults to
the pilot API. The factory still needs to register the product slug with the
billing service.

## Known gaps / next steps

- The static v1 intentionally does not open XLSX files, call SaaS APIs, infer
  semantic mappings, or bundle exports as ZIP. Those are outside the brief.
- Very large files are processed in browser memory. A future version can stream
  CSV parsing through a worker/OPFS while preserving the recipe format.
- Browser-level license verification cannot be fully exercised until the
  factory registers the staging product; failure and offline behavior are
  implemented and non-blocking.
