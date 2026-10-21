---
version: 1
slug: "src-app-locale-page-tsx"
primary_target: "src/app/[locale]/page.tsx"
related_targets: []
---

## Scope

Public landing page at eatrivo.sk (`/[locale]`), replacing the redirect-to-login for signed-out visitors. Mode: Persuade. Mobile-first (390px); first pass designed in Figma (file OVOAjKXfmpEoLLfw8htCeY, page "Landing – mobile").

## Audience and job

Signed-out phone visitor deciding whether Eatrivo is worth signing up for. Action: "Začať zadarmo" (sign up free). Proof: the product shown working (pantry photo → confirmed items → recipe → shopping list of only missing items). No invented stats or testimonials.

## Direction contract

THESIS: The first viewport is your own kitchen counter seen from above, the food you already own laid around Rivo's pan. It refuses the phone-mockup-plus-feature-grid SaaS hero.
OWN-WORLD: Eatrivo world from DESIGN.md: #FAFAFA ground, committed purple #7B3FF2 fields, Quicksand rounded type, pill controls, soft purple-tinted shadows, white pill ingredient tags on warm top-down food photography, Rivo mascot.
STORY: Visitor understands "Eatrivo cooks from what I already have", believes it by watching counter → recognized items → recipe → short shopping list, then taps Začať zadarmo.
FIRST VIEWPORT: 390×844. Slim bar (logo left, Prihlásiť sa right). Top-down counter photo full-bleed ~430px with 4 pill tags on ingredients; Rivo cut-out overlapping the photo's bottom-right edge. H1 "Máš doma viac, než si myslíš." 40px Quicksand Bold, one line of support, full-width purple pill CTA, trust line under it.
FORM: Kitchen counter, position 6 of 7 on the ranked list, seed 3ee00bce. Signature interaction: on scroll, ingredients slide into Rivo's pan and a recipe card emerges.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Hero photo is AI-generated placeholder; replace with a real shoot or confirm.
- Pro tier not shown (not confirmed shipped).
- Implemented in code (src/components/marketing/*, route src/app/[locale]/page.tsx; login moved to /[locale]/signin). Verified via headless screenshots at 390 and 1440 (sk, en, reduced motion). Figma desktop frame 232:138 itself still unscreenshotted.
- Confirm which features are in Free (especially photo-add) before shipping the pricing block.
- Built in Figma: page "Landing – mobile" (216:35), frame 221:60, components 221:26, notes 228:138.
- Finish review not run (no impeccable-finish-reviewer agent available in this session); DESIGN.md unchanged (surface inside the established world).
- Sign-in is Google only; the trust line says "Prihlásenie cez Google" (Figma copy said e-mail/Apple, which was wrong). Footer company IČO/DIČ omitted until provided.
