# Eatrivo Analytics Contract

Status: Proposed
Owner: Product + Engineering
Last updated: 2026-03-30

## Purpose

This document defines the analytics boundary for Eatrivo.

It answers three questions:

1. Which system owns which kind of analytics.
2. Which events are allowed to be sent to each destination.
3. Which properties are required, optional, or forbidden.

This contract is intended to keep Google Analytics, PostHog, and the internal database analytics layer from drifting into three competing sources of truth.

## System Ownership

### Google Analytics

Google Analytics owns acquisition and public-web conversion reporting.

Allowed use cases:

- Traffic source and campaign attribution
- Landing page performance
- Pricing page conversion
- Sign-in and sign-up entrypoint analysis
- Checkout start and confirmed purchase reporting

Not allowed:

- Product usage analytics inside the app
- Chat behavior details
- Meal plan or shopping list payloads
- Nutrition or health-related user inputs
- Session replay

### PostHog

PostHog owns product analytics.

Allowed use cases:

- Onboarding funnels
- Product activation funnels
- Feature adoption
- Retention and cohorts
- Billing UX behavior
- App navigation behavior
- Session replay only after explicit analytics consent and only if enabled intentionally

Not allowed:

- Raw chat content
- Health-related onboarding payloads
- Exact nutrition preferences or dietary restrictions payloads
- Ingredient lists or generated meal content payloads
- Long-form free text submitted by users

### Internal DB Analytics

The internal database analytics layer owns admin reporting and business event truth.

Allowed use cases:

- Admin dashboard reporting
- Auth lifecycle reporting
- Subscription lifecycle reporting
- Core feature completion events
- Internal operational analytics
- Audit-friendly joins with users, profiles, subscriptions, and AI outputs

Not allowed:

- Becoming a dumping ground for arbitrary UI noise
- Duplicating every GA or PostHog event without reporting value

## Consent Rules

### Google Analytics

- Requires analytics consent.
- Must not load before consent is granted.
- Must be wired through the existing cookie consent flow.

### PostHog

- Requires analytics consent.
- Must not load before consent is granted.
- Autocapture must be disabled by default.
- Session replay must be disabled by default.

### Internal DB Analytics

- May continue for internal business and operational events only within the legal basis chosen by the team.
- Must not accept sensitive arbitrary payloads.
- Must remain tightly validated at the API boundary.

## Identity Rules

### Google Analytics

- Do not send raw health-related identifiers or payloads.
- Use campaign and page context as the primary analysis dimensions.
- If a user identifier is ever considered, it must be reviewed against legal requirements first.

### PostHog

- Use a stable distinct identifier for product analytics.
- Identify only after consent.
- Do not attach sensitive user profile payloads.

### Internal DB Analytics

- `userId` is allowed.
- Events may join against internal tables for admin reporting.

## Event Naming Rules

- Use `snake_case` for event names.
- Prefer clear business or workflow names over generic names.
- Use `started`, `completed`, `failed`, `viewed`, `clicked`, `opened`, `submitted` suffixes where appropriate.
- Avoid catch-all event names like `interaction` for core business reporting.

Examples:

- `landing_viewed`
- `pricing_plan_selected`
- `checkout_started`
- `purchase_completed`
- `onboarding_step_completed`
- `meal_plan_generated`
- `shopping_list_created`
- `chat_session_started`

## Property Rules

### Common Safe Properties

These are generally safe for GA, PostHog, and DB if destination ownership allows the event.

- `locale`
- `membership`
- `source`
- `surface`
- `entrypoint`
- `session_id`
- `app_section`
- `experiment_variant`
- `device_type`
- `consent_analytics`

### Destination-Specific Business Properties

- `tier`
- `billing_period`
- `discount_code_present`
- `auth_provider`
- `error_code`
- `generation_time_bucket`
- `items_count_bucket`
- `message_length_bucket`
- `turn_index`
- `has_active_subscription`

### Forbidden Properties Outside Internal DB

- Raw user chat messages
- User profile health metrics
- Weight, calorie targets, macros, diagnosis-like data
- Full pantry inventory payloads
- Full shopping list payloads
- Full meal plan payloads
- Long free-text fields from forms

## Destination Matrix

| Event | GA | PostHog | DB | Notes |
|---|---|---|---|---|
| `landing_viewed` | Yes | No | No | Public acquisition only |
| `landing_cta_clicked` | Yes | No | No | Public acquisition only |
| `pricing_viewed` | Yes | No | No | Public conversion step |
| `pricing_plan_selected` | Yes | No | No | Pre-checkout intent |
| `signin_viewed` | Yes | No | No | Acquisition to auth transition |
| `signup_started` | Yes | No | No | Marketing conversion signal |
| `account_signed_up` | No | Yes | Yes | Product identity established |
| `account_logged_in` | No | Yes | Yes | Product entry event |
| `checkout_started` | Yes | Yes | Optional | Shared conversion event |
| `purchase_completed` | Yes | Yes | Yes | Server-confirmed if possible |
| `onboarding_started` | No | Yes | No | Product funnel only |
| `onboarding_step_viewed` | No | Yes | No | Product funnel only |
| `onboarding_step_completed` | No | Yes | No | Product funnel only |
| `onboarding_completed` | No | Yes | Yes | Activation milestone |
| `home_viewed` | No | Yes | No | Product usage |
| `meal_plan_generation_started` | No | Yes | No | Product usage |
| `meal_plan_generated` | No | Yes | Yes | Core completion event |
| `meal_plan_generation_failed` | No | Yes | No | Product diagnostics |
| `shopping_list_generation_started` | No | Yes | No | Product usage |
| `shopping_list_created` | No | Yes | Yes | Core completion event |
| `shopping_list_viewed` | No | Yes | Optional | Product behavior |
| `shopping_list_downloaded` | No | Yes | Yes | Only if admin team cares |
| `pantry_checkout_completed` | No | Yes | No | Product behavior |
| `custom_recipe_generation_started` | No | Yes | No | Product usage |
| `custom_recipe_generated` | No | Yes | Optional | Product usage |
| `custom_recipe_generation_failed` | No | Yes | No | Product diagnostics |
| `chat_session_started` | No | Yes | No | Product behavior |
| `chat_message_sent` | No | Yes | No | No raw content |
| `chat_response_received` | No | Yes | No | No raw content |
| `chat_limit_reached` | No | Yes | Yes | Useful for admin support |
| `billing_page_viewed` | No | Yes | No | Product UX |
| `billing_portal_opened` | No | Yes | No | Product UX |
| `subscription_upgraded` | Yes | Yes | Yes | Shared business event |
| `subscription_downgraded` | No | Optional | Yes | DB is source of truth |
| `subscription_cancelled` | No | Optional | Yes | DB is source of truth |
| `push_subscribed` | No | Optional | Yes | Operational admin signal |
| `admin_analytics_viewed` | No | No | Yes | Internal only |
| `ai_insight_generated` | No | No | Yes | Internal only |

## Recommended Event Definitions

### Acquisition Events

#### `landing_viewed`

Destinations: GA

Required properties:

- `locale`
- `landing_variant`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `referrer_domain`

#### `landing_cta_clicked`

Destinations: GA

Required properties:

- `locale`
- `cta_id`
- `cta_label`
- `section`

#### `pricing_viewed`

Destinations: GA

Required properties:

- `locale`
- `entrypoint`

#### `pricing_plan_selected`

Destinations: GA

Required properties:

- `tier`
- `billing_period`
- `source_page`

#### `checkout_started`

Destinations: GA, PostHog, optional DB

Required properties:

- `tier`
- `locale`
- `source_page`
- `discount_code_present`

#### `purchase_completed`

Destinations: GA, PostHog, DB

Required properties:

- `tier`
- `price_id`
- `trial_applied`
- `locale`

### Product Activation Events

#### `account_signed_up`

Destinations: PostHog, DB

Required properties:

- `auth_provider`
- `locale`

#### `account_logged_in`

Destinations: PostHog, DB

Required properties:

- `auth_provider`
- `locale`

#### `onboarding_started`

Destinations: PostHog

Required properties:

- `locale`
- `entrypoint`

#### `onboarding_step_completed`

Destinations: PostHog

Required properties:

- `step_name`
- `step_index`

#### `onboarding_completed`

Destinations: PostHog, DB

Required properties:

- `locale`
- `profile_created`

### Core Product Events

#### `meal_plan_generated`

Destinations: PostHog, DB

Required properties:

- `membership`
- `cached`
- `generation_time_bucket`

#### `shopping_list_created`

Destinations: PostHog, DB

Required properties:

- `membership`
- `source`
- `items_count_bucket`

#### `custom_recipe_generated`

Destinations: PostHog, optional DB

Required properties:

- `membership`
- `generation_time_bucket`

#### `chat_session_started`

Destinations: PostHog

Required properties:

- `membership`
- `source_page`

#### `chat_message_sent`

Destinations: PostHog

Required properties:

- `membership`
- `message_length_bucket`
- `turn_index`

Forbidden properties:

- `content`

### Billing Events

#### `billing_page_viewed`

Destinations: PostHog

Required properties:

- `membership`
- `has_active_subscription`

#### `subscription_upgraded`

Destinations: GA, PostHog, DB

Required properties:

- `from_tier`
- `to_tier`
- `trial_applied`

#### `subscription_cancelled`

Destinations: DB, optional PostHog

Required properties:

- `tier`
- `cancel_at_period_end`

## Current-to-Target Mapping

| Current event name | Target event name |
|---|---|
| `login` | `account_logged_in` |
| `signup` | `account_signed_up` |
| `logout` | `account_logged_out` |
| `upgrade` | `subscription_upgraded` |
| `downgrade` | `subscription_downgraded` |
| `cancel` | `subscription_cancelled` |
| `onboarding_complete` | `onboarding_completed` |
| `meal_plan_generated` | `meal_plan_generated` |
| `shopping_list_created` | `shopping_list_created` |
| `interaction` | Replace with explicit UI event names where valuable |
| `ai_request` | Split by use case or remove |

## Validation Rules

- Every event must declare a destination list in code.
- Every event must validate its property shape before dispatch.
- Every provider adapter must drop forbidden properties.
- Shared business events must use the same canonical event name across all destinations.
- Purchase and subscription state transitions should be confirmed server-side where possible.

## Source of Truth Summary

- GA is the source of truth for traffic and acquisition attribution.
- PostHog is the source of truth for product behavior and adoption funnels.
- Internal DB analytics is the source of truth for admin reporting and business lifecycle events.