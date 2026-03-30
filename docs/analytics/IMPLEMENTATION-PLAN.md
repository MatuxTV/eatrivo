# Eatrivo Analytics Implementation Plan

Status: Proposed
Owner: Engineering
Last updated: 2026-03-30

## Goal

Implement a hybrid analytics architecture with three clearly separated layers:

- Google Analytics for acquisition and public-web conversion
- PostHog for product analytics
- Internal database analytics for admin reporting and business truth

This plan assumes the contract in `docs/analytics/ANALYTICS-CONTRACT.md` is the canonical decision document.

## Current State Summary

The current stack already contains the following pieces:

- Internal DB event tracking in `src/lib/analytics.ts`
- Client tracking helper in `src/lib/analytics-client.ts`
- Tracking API in `src/app/api/analytics/track/route.ts`
- Admin analytics aggregation in `src/app/api/admin/analytics/route.ts`
- Admin analytics UI in `src/app/admin/components/tabs/AnalyticsTab.tsx`
- Cookie consent flow in `src/components/CookieConsent.tsx`
- Vercel Analytics gating in `src/components/ConditionalAnalytics.tsx`
- Google consent bootstrapping in `src/components/GoogleConsentMode.tsx`
- Root analytics bootstrapping point in `src/app/layout.tsx`

Important current risk:

- `src/app/api/analytics/track/route.ts` already appears in `SECURITY_AUDIT.md` as an area requiring careful validation and abuse protection. Do not broaden that API without tightening validation.

## Implementation Principles

1. Do not break the current admin analytics dashboard.
2. Do not let provider SDKs leak into business code.
3. Do not send sensitive health-like payloads to third-party analytics.
4. Do not ship GA or PostHog before consent gating is correct.
5. Roll out in phases with measurable checkpoints.

## Target Architecture

### Business-facing analytics API

Business code should emit canonical analytics events through a shared facade.

Suggested responsibilities:

- Canonical event name and property validation
- Destination routing by event definition
- Consent-aware client dispatch
- Server dispatch for trusted business events

### Provider adapters

Provider-specific code should live behind adapters:

- GA adapter
- PostHog adapter
- Internal DB adapter

### Provider bootstrap

Provider bootstrapping should be isolated to app shell wiring and consent-aware components.

## File-by-File Plan

## Phase 1: Contract and core abstraction

### Create `docs/analytics/ANALYTICS-CONTRACT.md`

Purpose:

- Define the event model and ownership boundary.

Status:

- Created in this change.

### Create `docs/analytics/IMPLEMENTATION-PLAN.md`

Purpose:

- Provide the implementation checklist and rollout sequence.

Status:

- Created in this change.

### Create `src/lib/analytics/events.ts`

Purpose:

- Define canonical event names.
- Define event property types.
- Define destination ownership.

Suggested contents:

- `AnalyticsDestination`
- `AnalyticsEventName`
- event metadata type map
- destination map per event
- forbidden property notes in comments

Acceptance criteria:

- There is one canonical registry of allowed events.

### Create `src/lib/analytics/types.ts`

Purpose:

- Hold reusable types for analytics context.

Suggested contents:

- `AnalyticsContext`
- `AnalyticsIdentity`
- `AnalyticsDispatchOptions`

Acceptance criteria:

- Shared types are provider-agnostic.

### Create `src/lib/analytics/facade.ts`

Purpose:

- Provide the single entry point for dispatching analytics events.

Suggested contents:

- `captureServerEvent(...)`
- `captureClientEvent(...)`
- routing to GA, PostHog, and DB sinks

Acceptance criteria:

- Business code only talks to the facade.

## Phase 2: Refactor current internal analytics to fit the contract

### Update `src/lib/analytics.ts`

Purpose:

- Reduce it to the internal DB sink and server-side helper compatibility layer.
- Map old event names to canonical names during transition.

Implementation notes:

- Keep backwards compatibility temporarily.
- Move event definitions out of this file into the new registry.

Acceptance criteria:

- Existing admin analytics still works.
- Existing auth and feature tracking still writes to DB.

### Update `src/lib/analytics-client.ts`

Purpose:

- Replace free-form interaction posting with a typed client dispatcher.

Implementation notes:

- Keep a small compatibility wrapper if current components still call `trackInteraction`.
- Route only approved UI events.

Acceptance criteria:

- Client analytics no longer uses arbitrary unnamed interaction events for important business flows.

### Update `src/app/api/analytics/track/route.ts`

Purpose:

- Tighten validation.
- Restrict accepted events to the canonical registry.
- Drop forbidden properties before persistence.

Implementation notes:

- Keep rate limiting.
- Validate metadata shape per event.
- Reject unknown event names.
- Reject oversized and unsafe payloads.

Acceptance criteria:

- Endpoint accepts only allowed client-originated events.
- No arbitrary metadata blobs are accepted.

## Phase 3: Bootstrap provider loading behind consent

### Update `src/components/CookieConsent.tsx`

Purpose:

- Keep analytics consent as the single switch for GA and PostHog loading.

Implementation notes:

- Preserve the current `analytics` preference.
- Ensure event listeners remain stable.

Acceptance criteria:

- Consent model remains a single source of truth.

### Update `src/components/ConditionalAnalytics.tsx`

Purpose:

- Convert this component from Vercel-only logic into a generic analytics loader gate or replace it with a new composition component.

Implementation notes:

- Remove direct dependency on `@vercel/analytics`.
- Use it to conditionally mount GA and PostHog providers after consent.

Acceptance criteria:

- No third-party analytics provider loads before consent.

### Update `src/components/GoogleConsentMode.tsx`

Purpose:

- Align the Google consent script with actual GA ownership.

Implementation notes:

- Keep consent default denied.
- Ensure update happens only from the shared cookie consent state.

Acceptance criteria:

- Google consent mode is accurate and minimal.

### Create `src/components/analytics/GaProvider.tsx`

Purpose:

- Bootstrap GA page and event tracking only for consented users.

Suggested contents:

- GA script bootstrapping
- optional page view helper wiring

Acceptance criteria:

- GA loads only after consent.

### Create `src/components/analytics/PostHogProvider.tsx`

Purpose:

- Bootstrap PostHog for consented users.

Implementation notes:

- Start with autocapture off.
- Start with replay off.

Acceptance criteria:

- PostHog loads only after consent.
- Replay and autocapture remain explicitly controlled.

### Update `src/app/layout.tsx`

Purpose:

- Wire the generic analytics loader, GA consent mode, and cookie banner in one predictable order.

Acceptance criteria:

- Layout remains the single bootstrap point for analytics providers.

## Phase 4: Google Analytics implementation for acquisition

### Update `src/app/[locale]/page.tsx`

Track:

- `landing_viewed`

Notes:

- Capture locale, landing variant if any, and source context where possible.

### Update landing components under `src/components/landing/`

Track:

- `landing_cta_clicked`
- Optional section-specific CTA clicks

Files likely involved:

- `HeroSection.tsx`
- `Pricing.tsx`
- `DownloadCTA.tsx`
- `Navbar.tsx`

### Update `src/app/[locale]/pricing/page.tsx`

Track:

- `pricing_viewed`

### Update pricing selection surfaces

Files likely involved:

- `src/components/billing/PricingCard.tsx`
- `src/components/landing/Pricing.tsx`

Track:

- `pricing_plan_selected`

### Update `src/app/[locale]/signin/page.tsx`

Track:

- `signin_viewed`

### Update `src/app/api/stripe/checkout/route.ts`

Track:

- `checkout_started`

Notes:

- This should be a server-trusted event with tier and source metadata.

### Update `src/app/api/stripe/webhook/route.ts`

Track:

- `purchase_completed`
- `subscription_upgraded`
- other subscription lifecycle truth events as needed

Acceptance criteria for Phase 4:

- GA reports traffic source, landing performance, pricing performance, checkout start, and purchase completion.

## Phase 5: PostHog implementation for product analytics

### Update `auth.ts`

Track:

- `account_signed_up`
- `account_logged_in`
- `account_logged_out`

Destinations:

- PostHog and DB

### Update `src/app/onboarding/components/OnBoardingPage.tsx`

Track:

- `onboarding_started`
- `onboarding_step_completed`
- `onboarding_completed`
- `onboarding_save_failed`

### Update `src/app/onboarding/components/ProfileSetup.tsx`

Track:

- `onboarding_step_viewed`
- `onboarding_step_completed`

### Update `src/app/onboarding/components/FoodPreferences.tsx`

Track:

- `onboarding_step_viewed`
- `onboarding_step_completed`

Notes:

- Do not emit raw consent or health data payloads to PostHog.

### Update `src/app/api/onboarding/post/route.ts`

Track:

- server-side `onboarding_completed`

Notes:

- Keep DB event for admin truth.

### Update `src/app/[locale]/home/page.tsx`

Track:

- `home_viewed`

### Update meal plan generation flow

Likely files:

- `src/app/api/meal-plans/route.ts`

Track:

- `meal_plan_generation_started`
- `meal_plan_generated`
- `meal_plan_generation_failed`

### Update shopping list flow

Likely files:

- `src/app/api/shopping-lists/generate/route.ts`
- `src/app/home/components/ShoppingListCard.tsx`
- `src/app/home/components/ShoppingListSection.tsx`

Track:

- `shopping_list_generation_started`
- `shopping_list_created`
- `shopping_list_viewed`
- `shopping_list_downloaded`
- `pantry_checkout_completed`

### Update custom recipe generation flow

Likely files:

- `src/app/api/recipes/custom/generate/route.ts`
- `src/app/home/components/RivoCustomRecipeExperience.tsx`

Track:

- `custom_recipe_generation_started`
- `custom_recipe_generated`
- `custom_recipe_generation_failed`

### Update chat flow

Likely files:

- `src/app/chat-with-rivo/ChatWithRivoPage.tsx`
- `src/app/api/chat/route.ts`

Track:

- `chat_session_started`
- `chat_message_sent`
- `chat_response_received`
- `chat_limit_reached`

Notes:

- Do not send raw message content to PostHog.

### Update billing UX flow

Likely files:

- `src/app/profile/billing/BillingPageClient.tsx`
- `src/components/billing/UpgradePopup.tsx`
- `src/components/billing/PricingCard.tsx`

Track:

- `billing_page_viewed`
- `billing_portal_opened`
- `upgrade_cta_clicked`

Acceptance criteria for Phase 5:

- PostHog can produce onboarding, activation, and feature-adoption funnels.

## Phase 6: Preserve and align internal admin analytics

### Update `src/app/api/admin/analytics/route.ts`

Purpose:

- Adjust event-name grouping if canonical names change.
- Keep admin reports stable during renaming.

Implementation notes:

- Consider temporary alias support while old and new names coexist.

### Update `src/app/admin/components/tabs/AnalyticsTab.tsx`

Purpose:

- Update event labels if canonical names change.

Acceptance criteria:

- Admin dashboard stays readable through migration.

### Update `src/db/schema.ts`

Purpose:

- Review whether the current event type enum remains sufficient.

Implementation notes:

- Avoid schema churn unless necessary.
- Prefer event name canonicalization before enum expansion.

## Phase 7: Infra and configuration

### Update `package.json`

Purpose:

- Add PostHog dependency.
- Remove Vercel Analytics if fully replaced.

### Update `next.config.ts`

Purpose:

- Add CSP allowances for GA and PostHog.

Checklist:

- `connect-src`
- `script-src`
- any image or ingestion endpoints if required

### Update `.env.example` and related env templates

Add:

- GA measurement ID
- PostHog public key
- PostHog host

Acceptance criteria:

- No CSP violations.
- Environment requirements are documented.

## Phase 8: Legal and documentation

### Update legal documents

Files:

- `public/legal/cookie-policy-sk.md`
- `public/legal/cookie-policy-en.md`
- `public/legal/privacy-policy-sk.md`
- `public/legal/privacy-policy-en.md`

Purpose:

- Replace Vercel Analytics references if removed.
- Add GA and PostHog processor references as needed.
- Keep consent language aligned with implementation.

### Update `README.md`

Purpose:

- Add a short section about the analytics architecture and local setup if useful.

## Rollout Checklist

### Stage 1

- Contract merged
- Analytics facade merged
- No provider behavior changed yet

### Stage 2

- GA loads only after consent
- PostHog loads only after consent
- Vercel Analytics removed or disabled

### Stage 3

- GA acquisition events verified in staging
- Stripe checkout and purchase events verified server-side

### Stage 4

- PostHog onboarding and home events verified in staging
- Sensitive payload audit completed

### Stage 5

- Shopping list, meal plan, recipe, and chat flows verified
- Admin analytics labels updated if needed

### Stage 6

- Legal documents updated
- CSP verified in production-like environment

## Verification Checklist

- No third-party analytics request fires before consent.
- GA receives only acquisition and conversion events.
- PostHog receives only product analytics events.
- DB analytics still powers `admin/analytics` correctly.
- Checkout and purchase are not double-counted.
- Raw chat content is never sent to PostHog.
- Health-like onboarding payloads are never sent to GA or PostHog.
- Unknown client analytics events are rejected by the API.

## Suggested Implementation Order

1. Create canonical event registry and facade.
2. Refactor internal DB analytics to use canonical names.
3. Replace Vercel-specific loader with a generic consent-aware analytics loader.
4. Wire GA for acquisition events.
5. Wire PostHog for onboarding and home.
6. Add shopping list, meal plan, recipe, chat, and billing product events.
7. Update admin reporting mappings.
8. Update CSP, env files, and legal text.

## Definition of Done

The migration is complete when:

- GA is the source of truth for acquisition.
- PostHog is the source of truth for product behavior.
- Internal DB analytics remains the source of truth for admin reporting.
- Consent gating is correct.
- Sensitive data stays out of third-party analytics.
- The team can implement new events using one documented contract and one dispatch API.