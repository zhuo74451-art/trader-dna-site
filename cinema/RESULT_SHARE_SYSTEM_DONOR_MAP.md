# Trader DNA Result + Share Web System · Donor Map

Updated: 2026-09-26

## Scope

This is the web-side system only. It covers:
1. the first result screen after Q18;
2. the lower share-card workbench;
3. continuity between those two appearances;
4. interaction of the share artifact while it is still inside the website.

The exported PNG/MP4 artifact remains a separate output layer.

## Large-loop donors

### Motion Primitives / Tilt
- Repository: https://github.com/ibelick/motion-primitives
- Source: `components/core/tilt.tsx`
- Mechanism copied:
  - normalize pointer position into -0.5..0.5;
  - map position into rotateX / rotateY;
  - perspective around 1000px;
  - reset to zero on pointer leave.
- Adaptation:
  - lower amplitude than donor; this is an identity artifact, not a toy card.

### React Bits / TiltedCard
- Repository: https://github.com/DavidHDev/react-bits
- Registry: `public/r/TiltedCard-JS-CSS.json`
- Mechanism copied:
  - separate 3D inner layer;
  - hover lift;
  - pointer-based rotation;
  - preserve-3d.

### React Bits / FlipCard
- Registry: `public/r/FlipCard-JS-CSS.json`
- Mechanism copied:
  - front/back faces;
  - `backface-visibility:hidden`;
  - 180deg rotor;
  - pointer tilt and flip are separate state;
  - reduced-motion fallback.

### React Bits / GlareHover
- Registry: `public/r/GlareHover-JS-CSS.json`
- Mechanism copied:
  - light/glare follows pointer position;
  - highlight remains a material response, not a background effect.

### Codrops / ScrollBasedLayoutAnimations
- Repository: https://github.com/codrops/ScrollBasedLayoutAnimations
- Source: `js/index.js`
- Mechanism copied:
  - capture first layout state;
  - move to final layout state;
  - animate one shared object between the two states;
  - do not destroy/recreate the artifact between scenes.
- Adaptation:
  - native Web Animations FLIP in the isolated lab, so production gets the behavior without adding GSAP just for one transition.

## Small-loop contract

### Result first screen
- Artifact may tilt slightly on desktop.
- Artifact may flip to a factual backside.
- Final Species character is a separate media layer and is intentionally absent until approved.
- Video and flip are **not competing modes**:
  - video / image / image-sequence = media layer;
  - tilt / flip / glare = container behavior.
- When a final Species motion asset exists, prefer a simple native `<video muted loop playsinline poster>` or approved image sequence before inventing a new playback engine.
- No HUD, random rings, or fake sci-fi furniture.

### Lower share workbench
- Reuse the same artifact.
- 4:5 / 9:16 switch changes framing, not the content hierarchy.
- Website can feel physical; exported file stays clean and flat.

### Signature continuity
The key behavior is not a new animation effect. It is:
**result identity object -> same object -> share artifact.**

## Production guardrails

- Do not ship the lab as production.
- Do not add a placeholder Species.
- Do not rewrite scoring or result content.
- Do not replace Material 02 static export.
- Mobile: no pointer-only dependency.
- Reduced motion: direct state change, no long travel.
