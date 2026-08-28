# Import Transform Ledger

A private, installable field utility for implementation consultants and
operations teams who repeatedly reshape supplier or legacy CSV exports for a
business system. It compares source and target columns, records reviewed
mappings and deterministic cleanup rules, rejects invalid or duplicate rows
with explicit reasons, and produces a portable handoff.

Live product: <https://import-transform-ledger.sociobot.in>

## What it does

- Reads UTF-8 and Windows-1252 CSV locally, with automatic delimiter detection.
- Maps a source export to a target CSV header without semantic or LLM guessing.
- Applies trim, case, date, numeric, default-value, and exact replacement rules.
- Detects duplicates using one or more transformed target fields.
- Previews clean rows and a reasoned rejection ledger before export.
- Exports ready CSV, rejection CSV, diffable recipe JSON, and a JSON report with
  SHA-256 checksums for the normalized source and all handoff artifacts.
- Imports saved recipes for zero-edit reruns when supplier headers remain stable.
- Persists the active workspace and recipe library in IndexedDB and works
  offline after the first successful visit.

The full transform and export workflow is free. The optional $29 one-time Field
Kit license unlocks an unlimited local saved-recipe library. Checkout and
license verification use the Sociobot billing API; no payment provider is
embedded in the app.

## Develop

Requires Node.js 20 or newer.

```sh
npm ci
npm run dev
```

The development server prints its local URL. No backend, account, or environment
variable is required for the free workflow.

## Test and build

```sh
npm test             # deterministic transform and artifact unit tests
npm run test:e2e     # Chromium workflow, mobile, axe, persistence, offline
npm run build        # reproducible static output in ./dist
npm run preview      # inspect the production build locally
```

Playwright is pinned to 1.58.2. Install its Chromium build with
`npx playwright install chromium` if it is not already available.

## Deploy and billing

Deploy the contents of `dist/` as a static site with `index.html` at the root.
`public/privacy/` and `public/terms/` become direct static routes. The service
worker expects the app at the origin root.

Staging uses `https://pilot-api.sociobot.in` by default. Set
`VITE_BILLING_BASE=https://api.sociobot.in` for production builds after the
factory registers the slug. No numeric product ID or payment secret belongs in
this repository.

## Privacy and architecture

All CSV parsing, transformation, comparison, and export happen in the browser.
Workspace data and saved recipes use IndexedDB. The license token and daily
verification verdict use localStorage. There are no analytics, third-party
fonts, or runtime scripts. See the in-product [privacy policy](public/privacy/index.html).

The product brief is in [.factory/brief.json](.factory/brief.json), its original
visual and asset provenance is in [.factory/design.md](.factory/design.md), and
release verification is recorded in [.factory/handoff.md](.factory/handoff.md).
