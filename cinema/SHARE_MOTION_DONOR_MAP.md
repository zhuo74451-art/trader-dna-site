# Trader DNA Share Motion · Donor Map

Updated: 2026-09-26

## Product target

The share artifact is not a generic animated poster. Its signature moment should communicate **identity formation**:

1. four DNA letters exist separately;
2. they assemble into the user's four-letter Trader DNA;
3. role name and public line lock in;
4. the user's 18 decisions generate the Decision Relief / fingerprint;
5. the card settles into the same static frame that can also ship as PNG;
6. the final Species / character layer is added only when the approved character asset exists.

## Large-loop donors

### Codrops / LayersAnimation
- Repo: https://github.com/codrops/LayersAnimation
- License: MIT
- Relevant implementation: `js/demo1/index.js`, `js/demo3/index.js`, `js/demo5/index.js`
- What we reuse conceptually:
  - layered clip-path reveal;
  - 1.4s `power3.inOut`-style movement;
  - small stagger between layers;
  - content brightness / scale changes kept subordinate to the main reveal.
- What we do **not** copy:
  - image slideshow content model;
  - repeated full-screen transitions;
  - decorative effect density.

### GSAP FLIP
- Docs: https://gsap.com/docs/v3/Plugins/Flip/
- What we reuse conceptually:
  - continuity between scattered DNA letters and their final composed position;
  - one object, two states, no arbitrary fade replacement.

### Codrops typography / clip-path studies
- https://tympanus.net/codrops/tag/clip-path/
- What we reuse conceptually:
  - sliced typography;
  - mask reveal instead of generic opacity-only entrances.

## Small-loop adaptation

Current isolated lab:
- `/share-motion-lab.html`
- `/cinema/share-motion-lab.js`

Current signature direction:
- **DNA ASSEMBLY**
- four letters converge into one code;
- 18 decisions become a generated relief;
- one restrained foil pass;
- no HUD rings;
- no fake character placeholder.

## Guardrails

- Production static card remains the authority until a motion version is explicitly promoted.
- No fake Species art in production or gold samples.
- No GIF as primary format. Prefer MP4/WebM with PNG fallback.
- Motion must end on a strong static frame.
- Maximum one primary signature motion per share card.
