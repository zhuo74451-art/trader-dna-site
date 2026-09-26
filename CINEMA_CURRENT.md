# Current cinema presentation

Active presentation entry: `cinema-detail-04.html`.
Public presentation URL: https://zhuo74451-art.github.io/trader-dna-site/cinema-detail-04.html
Stable runtime alias: `scan01.html`.
Permanent printed QR entry: https://82trade-team.github.io/dna/

The printed QR belongs to the separate public gateway repository `82trade-team/dna`. That URL is the only long-lived QR authority. It currently redirects to this repository's `scan01.html` alias. Future V5/V6 visual releases should update the gateway target and/or `scan01.html`; do not create a second printed QR.

`scan01.html` and `cinema-detail-04.html` now share the same active 18-question core runtime: `cinema/core-app18-20260927.js`. `cinema-detail-03.html` is preserved for rollback. The repository root `index.html` no longer exposes the legacy product and forwards to `scan01.html`.

Presentation source, deterministic build and acceptance tests: `cinema/detail04/`.
Immutable script/style paths and exact entry hash: `cinema/detail04/BUILD.json`.
Local full regression: `cinema/detail04/ACCEPTANCE_MOBILE_20260921.json`.
Public full regression: `cinema/detail04/LIVE_ACCEPTANCE_20260921.json`.
Permanent QR routing contract: `cinema/detail04/QR_GATE.md`.
Portrait-card performance gates: `cinema/detail04/PORTRAIT_PERF_GATE.json` and `cinema/detail04/PORTRAIT_PERF_GATE_LIVE.json`.
Portrait optimization: all 32 archive cards use 720px WebP derivatives; same-type portraits are warmed during identity reveal while dossier dialogs retain the original full-resolution image. On the live throttled gate, the IAGF pair was ready 6 ms after the result DOM appeared, with no full-resolution originals requested for inline cards.

## Current product scope override · 2026-09-27

Owner direction supersedes the older 54-question presentation freeze:

- Public product = **18 questions only**.
- Q19–54 / `data/questions-2.json` / `data/questions-3.json` are **dormant source**, retained for possible future revival but not loaded, linked, or precached by the active runtime.
- After Q18, go directly to identity reveal/result. No "continue full 54" branch.
- Do not delete dormant 54Q source unless Owner explicitly requests deletion.
- The next content change is replacement of the active 18 questions when the finalized 18Q source is supplied.
- Result naming / slogan copy may receive light alignment edits when the finalized identity names are supplied.
- Species character/media integration remains a presentation-layer change; do not rewrite scoring to accommodate art.

Continue from these files and the actual rendered site. Keep scoring semantics, backend/auth, and public 4-letter DNA mechanics unchanged unless the Owner explicitly changes them. Keep preview and exported PNG on the same artifact.
