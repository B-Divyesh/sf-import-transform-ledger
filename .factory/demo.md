# Demo sandbox

Open <https://import-transform-ledger.sociobot.in/demo> or add `?demo=1` to the home URL.

The demo starts with a five-row supplier export. It shows two ready rows, three rejected rows, and one duplicate after reviewed mappings and cleanup rules. It uses the IndexedDB database named `import-transform-ledger:demo`. Real work uses the separate `import-transform-ledger` database.

The banner remains visible throughout the demo. **Reset demo** clears only the demo database and reloads the shipped sample. **Start for real** clears only the demo database, then opens the real workspace. Neither action reads or writes real workspace data.

The service worker precaches `/demo`, the app shell, and the sample workflow so the demo can be reloaded offline after its first visit.
