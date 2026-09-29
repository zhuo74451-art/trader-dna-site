# Permanent Trader DNA QR routing contract

Canonical printed QR URL:

`https://82trade-team.github.io/dna/`

The user's existing QR decodes to that URL. It is the permanent unified entry and must be reused; do not generate a replacement QR for normal releases or events.

Gateway repository: `82trade-team/dna`.
Current gateway target: `https://zhuo74451-art.github.io/trader-dna-site/scan01-authority-preview.html`.

Routing rule: printed QR → `82trade-team.github.io/dna/` → current Trader DNA runtime. The gateway preserves incoming query parameters and fragments. Future site migrations require changing only the gateway target; already printed QR codes stay valid.

`scan01.html` remains the stable local alias and now loads the same authority release. The gateway targets the authority page directly so previously installed service workers cannot serve an older cached alias on the first scan.

The previously generated `scan01-event-qr-20261003.png` and `event-qr-20261003.html` were removed because they created an unnecessary second QR authority.

Mobile and full browser regressions remain recorded in `MOBILE_QR_GATE*.json` and `*_ACCEPTANCE_20260921.json`; those files validate the target runtime, not a second QR code.
