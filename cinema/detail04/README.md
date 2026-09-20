# Trader DNA / Detail 04

Presentation-only continuation of the accepted Detail 03 site. The 18/54-question assessment, type mapping, completion event and local persistence remain unchanged.

## Design changes

The question surface is now a quiet decision folio: six live nodes per phase, equal-weight material choice panels, an evolving paper receipt, visible selection feedback and native keyboard focus. The result transition connects the receipt to a visible identity sheet; it does not insert a black curtain. The identity artifact keeps its three-dimensional layers and uses an answer-derived engraved ribbon rather than a mechanical chart line.

Archive cards use one contained backing sheet, consistent monochrome treatment, per-asset framing and readable source attribution. The existing photographed portraits replace earlier illustrative placeholders; historical paintings and sculpture remain correctly labeled. Enlarging a file is not represented as creating source detail. Existing third-party image permissions and resolutions are not upgraded by this release.

Mobile gets a compact progress receipt, stacked touch targets and an accessible navigation toggle. Reduced-motion users receive the settled identity without convergence animation. No page-scroll hijacking or continuous animation loop is introduced.

## Visual references

- Pentagram / The Public Theater: https://www.pentagram.com/work/the-public-theater — typographic hierarchy and editorial contrast, not copied assets.
- Instrument: https://www.instrument.com/work — restrained motion and transitions tied to content.
- Studio Kiln: https://www.studio-kiln.com/ — tactile art direction and consistent identity systems.

## Ownership and rollback

`app.js`, `event-persistence.js`, canonical `data/*.json` and their hashed core copies are unchanged. No backend, identity or access-control changes. `cinema-detail-03.html` remains available as the previous edition. The Material 02 and dated cinema entry aliases point to Detail 04; the unrelated root `index.html` is not replaced.

Source: `edition.css`, `edition.js`. Generated immutable assets and HTML hashes are recorded in `BUILD.json`. Acceptance evidence is recorded alongside this file after testing. Browser viewport and reduced-motion tests do not substitute for physical iPhone/Android acceptance.
