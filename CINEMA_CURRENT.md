# Current cinema presentation

Active presentation entry: `cinema-detail-04.html`.
Public presentation URL: https://zhuo74451-art.github.io/trader-dna-site/cinema-detail-04.html
Stable runtime alias: `scan01.html`.
Permanent printed QR entry: https://82trade-team.github.io/dna/

The printed QR belongs to the separate public gateway repository `82trade-team/dna`. That URL is the only long-lived QR authority. It currently redirects to this repository's `scan01-authority-preview.html`; `scan01.html` loads the same authority release. Future V5/V6 visual releases should update the gateway target and stable alias; do not create a second printed QR.

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


## Result + Share candidate · RS-01 · 2026-09-27

Isolated candidate entry:
- https://zhuo74451-art.github.io/trader-dna-site/cinema-detail-05-candidate.html

Verified behavior:
- active assessment remains 18 questions only;
- existing Detail04 V47 pointer/parallax is reused rather than replaced;
- identity object can flip to a back face through an external accessible control;
- the same issued identity visually travels into the existing share studio;
- publication finishes through the existing Material 02 pipeline;
- 4:5 / 9:16 export authority remains unchanged;
- headless interaction receipt: PASS.

Status:
- **MECHANISM ACCEPTED / VISUAL NOT PROMOTED**.
- Do not make this the stable QR/runtime target yet.
- Final first-screen Species media and final share-card Species composition wait for approved initial-form character assets.


## Experience candidate · EC-01 · 2026-09-27

Isolated entry:
- https://zhuo74451-art.github.io/trader-dna-site/cinema-detail-06-experience-candidate.html

Frozen six-scene structure:
1. Origin / unassigned Species
2. 18-question assessment
3. Q18 identity formation
4. initial-class result
5. Material 02 share artifact
6. 16 Initial Classes archive

Large-loop result:
- no new runtime motion dependency is required;
- current internal Q18 particle morph remains the primary signature reveal;
- V47 remains result tilt/parallax authority;
- RS-01 remains result flip + shared-object-to-share continuity;
- Archive uses native scroll-snap once all 16 approved thumbnails exist.

Current visual status:
- EC-01 browser flow and asset-gating policy: PASS.
- Base Species and class media are intentionally not faked when missing.
- Do not promote EC-01 to the stable QR target until approved visual media has been mounted and static/mobile screenshots pass.

## Final Quick-18 source seal · 2026-09-27

Owner-supplied `Trader_DNA_Quick_18_V1.2_台灣繁體版.docx` was mechanically checked against active `data/questions-1.json`.

- Q1-Q18 question text: 18/18 match after whitespace normalization.
- A choices: 18/18 match.
- B choices: 18/18 match.
- Existing facet/pole metadata remains untouched.
- Therefore no question-copy replacement is required for V1.2; active Quick-18 already carries the supplied final wording.


## Initial-class copy layering · 2026-09-27

Copy roles are now intentionally split:

- **Initial-class tagline** = short profession-readable line from the approved 16-class visual bible (e.g. 狙擊手「等待最好的一擊。」). Used in Archive and EC-01 result as a secondary identity seal.
- **Trader DNA hook/body/reminder** = existing model interpretation copy from `data/types.json`. Keep it as the explanation of the decision pattern; do not rewrite it merely to make the profession name more literal.
- Share card remains restrained: role name + existing public hook + character art. Do not add every copy layer to the public artifact.

This avoids a false choice between profession readability and measurement fidelity.


## EC-01 visual-bible integration seal · 2026-09-27

Current isolated candidate:
- https://zhuo74451-art.github.io/trader-dna-site/cinema-detail-06-experience-candidate.html

Verified after mounting the approved Initial Class Visual Bible:
- Origin uses the approved unassigned Species asset.
- Q18 remains the only M2 identity-formation moment.
- Result uses the approved initial-class crop plus the short profession-readable tagline.
- Existing Trader DNA hook/body/reminder remain the interpretation layer.
- Material 02 remains the warm-white public share authority and receives a restrained initial-class art layer.
- 16 Initial Classes archive is mounted from the approved visual bible and uses the approved short class taglines.
- Desktop, mobile, reduced-motion, flip, result-to-share continuity, 4:5/9:16 share publication: PASS.
- Active assessment remains 18-only; dormant Q19-54 data is not requested.

Stale-copy audit:
- no public code hits for 風險工程師 / 精準狙擊手 / 落子手 / 趨勢追蹤官;
- no public code hits for 繼續完整 54 題 / STANDARD 54.

Current limitation:
- The 16-class visual-bible crops are sufficient for candidate composition and archive browsing, but are still softer than future isolated high-resolution production renders when enlarged on the result hero.
- Do not solve this by inventing a new character. Replace the manifest media slots with isolated approved renders later.

Promotion status:
- **EC-01 = END-TO-END CANDIDATE PASS / NOT YET STABLE-QR PROMOTED.**
