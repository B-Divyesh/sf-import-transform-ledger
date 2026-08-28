# Import Transform Ledger — verification handoff

## Status: FAIL

Independent QA of candidate `213a046051723b52b81fba940b9c3b5b3aa95134`
against <https://import-transform-ledger.sociobot.in> completed on 2026-08-28.
The live runtime files match the candidate byte-for-byte and the local-first
CSV workflow is functional, but this candidate cannot be promoted until the
following defects are resolved:

1. **High — ITL-QA-008:** the Sociobot license verification endpoint returned
   HTTP 200 for all 80 requests in a rapid 16-concurrent invalid-token burst;
   no `429` and no `Retry-After` were observed.
2. **Medium — ITL-QA-009:** at 390px, a cold service-worker offline reload
   hides the sole explicit offline indicator and visibly says only “Ready.”

Full reproducible evidence, commands, deployment identity, exact endpoint,
and all passing checks are in `.factory/verification-3.md`.

Verified passing: `npm ci`, 15 unit/config tests, typecheck, available lint,
production build, all 9 browser specs, custom Windows-1252/import/export/
checksum/rerun/recovery testing, live/offline PWA shell, 390px keyboard and
reduced motion, axe, response policies, privacy traffic, deployment hashes,
and Lighthouse (96/100/100/100).

No product code was changed by the verifier. The next action is to apply rate
limiting at the factory verification API and make the mobile cold-offline state
visible, then rerun the two failing checks.
