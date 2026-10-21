# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Slovak (and Czech/English-speaking) home cooks on their phones, standing in the kitchen or at the store, who want to eat healthier toward a goal (lose weight, maintain, gain muscle) without planning meals from scratch. Most reach eatrivo.sk on mobile; the product is an installable PWA.

## Product Purpose

Eatrivo turns what is already in your kitchen into meals that fit your goal. You keep a digital pantry (špajza), Rivo (the AI chef assistant) suggests and adapts recipes from it, and the shopping list covers only what is missing. Success: the visitor signs up free and adds their first pantry items.

## Positioning

Pantry-first: "Uvar z toho, čo už máš." Instead of a generic meal plan you then shop for, Eatrivo starts from the food you own, so less waste and fewer store trips, while still respecting your goal, diet, and allergies.

## Operating Context

- Adding food: manual entry, "Pridať z fotky" (photos of food, AI recognizes items, user confirms), receipt scan ("Sken bloku", Plus), barcode scan (Plus).
- Pantry tracks expiring items ("Expiruje").
- Rivo chat ("chat-with-rivo") and the "Kuchynský pult" (kitchen counter) recipe flow.
- Onboarding captures age, weight, goal, preferences, allergies (~2 min).

## Capabilities and Constraints

- Tiers: Free; Plus €3.99/month (receipt scan, barcode scan, priority dev support); Pro listed in copy but not confirmed as shipped. Stripe billing, cancel anytime.
- Sign-in: Google only (NextAuth Google provider, `/[locale]/signin`). Logged-in visitors to `/` redirect to `/home`; signed-out visitors see the landing page.
- Languages: Slovak (default), English, via next-intl. All copy must route through locales.
- Recipe personalization per goal/taste marked "PRIPRAVUJEME" (coming soon); do not present it as live.

## Brand Commitments

- Name: Eatrivo (wordmark "EATRIVO", Quicksand-like rounded sans). Logo: heart-shaped spoon, white line on purple circle (Figma file OVOAjKXfmpEoLLfw8htCeY, node 1:2).
- Mascot: Rivo, a purple heart-shaped pan chef with a toque (`public/rivo/RIVO*-remove.png`).
- Voice: friendly, informal "ty", short, warm; a touch playful (Rivo speaks).

## Evidence on Hand

- Real app UI (pantry, meal cards, nutrition summary) can be shown as product demonstration.
- No real user counts, ratings, or testimonials exist. The figures in `locales/*.json` `landing.socialProof` / `landing.testimonials` are invented and must not be shown.

## Product Principles

1. Start from what the user has, not from what they should buy.
2. The user always confirms what AI recognized before it is saved.
3. Show the product working instead of claiming results.
4. Mobile is the primary context.
