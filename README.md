# Clean and document CSV imports

Import Transform Ledger is for implementation consultants and operations staff preparing supplier or legacy CSV data for a business system.

Live product: <https://import-transform-ledger.sociobot.in>

Try the isolated sample: <https://import-transform-ledger.sociobot.in/demo>

## What it does

- Processes CSV mappings, cleanup, review, and exports in the browser.
- Keeps CSV rows on the device and works offline after the first visit.
- Reads UTF-8 and Windows-1252 files and detects comma, semicolon, and tab delimiters.
- Preselects only matching header names; it does not guess sensitive mappings.
- Applies deterministic cleanup rules and detects duplicates on transformed target fields.
- Gives every rejected row a reason, then exports ready CSV, rejection CSV, recipe JSON, and a checksum report.
- Exports readable recipe JSON that can be imported for a rerun.
- Keeps the complete transform, review, export, and recipe JSON workflow free.
- Uses no analytics, tracking, third-party fonts, or third-party runtime scripts.

The sample at `/demo` uses a separate browser database. Resetting it or starting for real does not alter a real workspace.

Field Kit is a $29 one-time license for an unlimited local saved-recipe library when purchases are open. The full free workflow stays available while billing registration is unavailable. See [Terms](public/terms/index.html) and [Privacy](public/privacy/index.html).

## Develop

Requires Node.js 20 or newer.

```sh
npm ci
npm run dev
```

## Test and build

Run these commands from a clean checkout after `npm ci`.

```sh
npm test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
npm run test:claims
```

`npm run test:claims -- --grep @claim:<id>` runs the single outcome-based browser test recorded for a claim in [.factory/claims.json](.factory/claims.json). Playwright is pinned to 1.58.2. If Chromium is unavailable, run `npx playwright install chromium`.

`npm run preview -- --port 4173` serves `dist/` with the product’s designed 404 response. `scripts/verify-url.sh <url>` checks basic document structure, image alternatives, and console errors against a running URL.

## Deploy

Deploy the contents of `dist/` as a static site with `index.html` at the root. The build contains `/demo`, `/privacy/`, `/terms/`, a service worker, manifest, and a configured 404 response. The product has no backend.

The closed-billing build exposes no checkout or license-restore control. When the factory registers the exact product offer, build with `VITE_BILLING_ENABLED=true`; use only the approved Sociobot billing API origin. No payment secret belongs in this repository.

## Project records

- [Product brief](.factory/brief.json)
- [Design and artwork provenance](.factory/design.md)
- [Demo boundary](.factory/demo.md)
- [Claim ledger](.factory/claims.json)
- [Current handoff](.factory/handoff.md)
