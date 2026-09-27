# Reading V43 — Visual + Experience Brief

## 1. Purpose
- Product/page: 82TRADE homepage recommended-reading section.
- Primary action: browse a short curated shelf and understand why each book is recommended.
- First 3 seconds: this should read as a physical editorial shelf, not a grid of cards.
- Remember tomorrow: the books feel like real objects, and every recommendation has a concise point of view.

## 2. Existing truth
- Keep: V39/V42 Framer-matched geometry, shared baseline, true-HQ covers, restrained yaw, short soft contact shadow, drag inertia.
- Fix: remove QA-only page scaffolding; make data, events, keyboard focus and asset loading safe for host integration.
- Never break: vertical page scroll, mobile reading, reduced motion, current-book synchronization.
- Strong assets: six 1200px publisher cover files already in assets/books/hq.
- Missing assets: final editorial book list is intentionally not frozen yet.

## 3. Art direction
A black editorial reading shelf with true-color physical books and one quiet recommendation column; tactile and authored, never cyberpunk.

- Composition: shallow horizontal shelf + clean right editorial plane; mobile becomes shelf above copy.
- Typography: restrained serif editorial title, tiny sans metadata.
- 3D treatment: thin hardcovers, visible spine/page depth, physically planted.
- Material: matte paper/cloth with a restrained laminate response.
- Motion: inertial, user-controlled, quiet.
- Density: one M2 object strip, everything else M0.

## 4. Reference assignment
- Ameva Framer 3D Book Carousel -> spacing, baseline, yaw, product-shot composition.
- ICS three-coverflow / Ashish Gogula coverflow -> drag/inertia mechanism only.
- Existing 82TRADE Reading V18/V24 -> editorial recommendation language.
- V39/V42 -> frozen component geometry and integration behavior.

## 5. Scene map
| Scene | User task | Class | Intensity | Gap | Signature |
| --- | --- | --- | --- | --- | --- |
| Book shelf | browse/select | Showcase | M2 | Material + Identity | yes |
| Recommendation copy | understand why | Story/Utility | M0 | Response | no |
| Mobile fallback | browse/read | Utility | M0 | Continuity | no |

## 6. Signature Moment contract
- Trigger: drag, horizontal trackpad movement, click, or focused arrow keys.
- User controls: selection and speed.
- Start: six physical books on one grounded shelf.
- Transformation: shelf moves with inertia; nearest book settles subtly forward and its editorial explanation updates.
- Payoff: recommendation context follows the selected object.
- Mobile: touch drag with vertical pan preserved.
- Reduced motion: selection snaps directly.
- Why it belongs: books themselves are the content, so the interaction makes the medium physical rather than decorating unrelated UI.

## 7. Static checkpoint
V39/V42 already pass the still-image checkpoint: no motion is required to understand the hierarchy, cover art is not placeholder art, and the recommendation column remains readable.
