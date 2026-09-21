# Current cinema presentation

Active presentation entry: `cinema-detail-04.html`.
Public presentation URL: https://zhuo74451-art.github.io/trader-dna-site/cinema-detail-04.html
Stable event entry: `scan01.html`.
Event QR sheet: `event-qr-20261003.html`.

The `scan01.html`, `cinema-material-02.html` and `cinema-20260920.html` aliases serve the same Detail 04 runtime. The event QR points to the stable `scan01.html` alias with `start=scan01` and UTM parameters, so future visual releases can update the alias without reprinting the QR. `cinema-detail-03.html` is preserved for rollback. The unrelated `index.html` is not the cinema design authority and has not been replaced.

Functional release commit: `098b6cc81c91f18d2307875f1717fe2a6696bfb3`.
Presentation source, deterministic build and acceptance tests: `cinema/detail04/`.
Immutable script/style paths and exact entry hash: `cinema/detail04/BUILD.json`.
Local full regression: `cinema/detail04/ACCEPTANCE_MOBILE_20260921.json`.
Local mobile/QR gate: `cinema/detail04/MOBILE_QR_GATE.json`.
Public full regression: `cinema/detail04/LIVE_ACCEPTANCE_20260921.json`.
Public mobile/QR gate: `cinema/detail04/MOBILE_QR_GATE_LIVE.json`.
QR generation/print contract: `cinema/detail04/QR_GATE.md`.

Continue from these files and the actual rendered site. Do not reopen scoring, question count, type mapping, completion/persistence, backend or auth while refining presentation. The new share adapter prevents the legacy auto-renderer from replacing the intended poster preview. Keep preview and exported PNG on the same artifact.
