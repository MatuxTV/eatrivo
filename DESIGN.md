---
version: alpha
name: Eatrivo
description: Mobile-first meal planning and pantry assistant with a light wellness aesthetic, rounded tactile controls, and soft conversational AI accents.
colors:
  primary: "#7B3FF2"
  primary-hover: "#6B2CE8"
  primary-soft: "#EFE3FF"
  accent: "#EC4899"
  accent-soft: "#FFDCE9"
  success: "#22C55E"
  success-soft: "#DCFCE7"
  mint: "#DDF7EE"
  warning: "#F97316"
  warning-soft: "#FFEDD5"
  background: "#FAFAFA"
  background-alt: "#F8FAFC"
  surface: "#FFFFFF"
  surface-tint: "#F6EDFF"
  border: "#E5E7EB"
  border-soft: "#F3F4F6"
  border-purple: "#E9D9FF"
  text-primary: "#111827"
  text-strong: "#172033"
  text-secondary: "#6B7280"
  text-muted: "#9CA3AF"
  icon-muted: "#9CA3AF"
  white: "#FFFFFF"
typography:
  display-xl:
    fontFamily: Quicksand
    fontSize: 3rem
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -0.04em
  display-lg:
    fontFamily: Quicksand
    fontSize: 2.5rem
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: -0.035em
  h1:
    fontFamily: Quicksand
    fontSize: 2rem
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: -0.03em
  h2:
    fontFamily: Quicksand
    fontSize: 1.5rem
    fontWeight: 700
    lineHeight: 1.18
    letterSpacing: -0.025em
  title-lg:
    fontFamily: Quicksand
    fontSize: 1.25rem
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Quicksand
    fontSize: 1.125rem
    fontWeight: 500
    lineHeight: 1.6
  body-md:
    fontFamily: Quicksand
    fontSize: 1rem
    fontWeight: 500
    lineHeight: 1.55
  body-sm:
    fontFamily: Quicksand
    fontSize: 0.9375rem
    fontWeight: 500
    lineHeight: 1.5
  label-md:
    fontFamily: Quicksand
    fontSize: 0.875rem
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: 0em
  label-sm:
    fontFamily: Quicksand
    fontSize: 0.75rem
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0.22em
rounded:
  none: 0px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
  full: 999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  xxxl: 40px
  section: 48px
components:
  app-shell:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text-primary}"
    padding: "{spacing.lg}"
    rounded: "{rounded.none}"
  header-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    padding: "{spacing.md}"
    shadow: "0 1px 0 #F3F4F6"
  card-primary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
    shadow: "0 10px 30px rgba(17, 24, 39, 0.06)"
    borderColor: "{colors.border-soft}"
  card-elevated:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xxl}"
    padding: "{spacing.xl}"
    shadow: "0 20px 55px rgba(121, 78, 171, 0.10)"
    borderColor: "{colors.border-purple}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.full}"
    padding: "14px 24px"
    shadow: "0 12px 28px rgba(123, 63, 242, 0.28)"
    backgroundImage: "linear-gradient(90deg, #7B3FF2 0%, #8B5CF6 100%)"
  button-chat:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.full}"
    padding: "14px 20px"
    shadow: "0 16px 32px rgba(123, 63, 242, 0.25)"
    backgroundImage: "linear-gradient(135deg, #7B3FF2 0%, #EC4899 100%)"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.full}"
    padding: "12px 20px"
    shadow: "0 8px 20px rgba(17, 24, 39, 0.05)"
    borderColor: "{colors.border}"
  segmented-control:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.full}"
    padding: "4px"
    shadow: "0 8px 20px rgba(17, 24, 39, 0.06)"
  segmented-control-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.full}"
    shadow: "0 10px 24px rgba(123, 63, 242, 0.22)"
  stat-tile:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
    shadow: "0 8px 20px rgba(17, 24, 39, 0.06)"
    borderColor: "{colors.border-soft}"
  input-pill:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xxl}"
    padding: "12px 20px"
    shadow: "0 8px 30px rgba(123, 63, 242, 0.12)"
    borderColor: "{colors.border-purple}"
    backdropFilter: "blur(16px)"
  nav-bottom:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.icon-muted}"
    height: 72px
    shadow: "0 -4px 20px rgba(0, 0, 0, 0.04)"
  nav-fab:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    width: 44px
    height: 44px
    rounded: "{rounded.full}"
    shadow: "0 14px 30px rgba(123, 63, 242, 0.32)"
    ring: "4px solid #EFE3FF"
  tutorial-modal:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xxl}"
    padding: "{spacing.xl}"
    shadow: "0 40px 120px rgba(56, 36, 86, 0.28)"
    backgroundImage: "radial-gradient(circle at top, #FFF9FD 0%, #F5ECFF 54%, #F3ECFF 100%)"
  motion-standard:
    transition: "220ms cubic-bezier(0.22, 1, 0.36, 1)"
  motion-enter:
    transition: "280ms cubic-bezier(0.22, 1, 0.36, 1)"
  motion-float:
    transition: "4000ms ease-in-out infinite"
---

## Overview

Eatrivo should feel like a calm nutrition companion, not a dense productivity tool. The product lives in a bright, almost clinical-clean field of off-white space, then layers in warmth through violet gradients, soft pink highlights, mint nutritional accents, and a friendly illustrated assistant. The emotional target is reassurance: meal planning, pantry tracking, and chat should feel gentle, guided, and low-friction.

The system is decisively mobile-first. Most important screens are composed as stacked white cards floating on a pale canvas, with oversized radii, generous internal padding, and strong tap affordances. Purple carries the brand and most calls to action, while pink appears as a secondary flourish reserved for conversational or celebratory moments. Green is used sparingly for freshness, macros, success, and healthy confirmation states.

## Colors

The palette is light-first and restraint-heavy. Large areas stay neutral so the purple brand color can stay unmistakable without overwhelming the screen.

- Primary purple is the anchor for selected tabs, the central chat action, high-priority buttons, and active navigation.
- Pink is never the dominant base; it is a supporting accent inside gradients, assistant flows, and subtle atmospheric blooms.
- Surfaces stay white or near-white. Avoid gray-heavy dashboards, dark panels, or muddy tinted cards.
- Borders are soft and low-contrast. Most structure should come from spacing, radius, and shadow rather than hard dividers.
- Success states should read fresh and nutritional, leaning mint or bright green rather than enterprise emerald.

## Typography

Typography should feel friendly, round, and energetic. Use Quicksand as the primary face across display text, titles, labels, and body copy. It gives the product a more human and optimistic voice than a neutral system sans.

- Headlines are bold, compact, and slightly tightened. They should feel soft but confident, especially on recipe cards and onboarding slides.
- Body copy should stay highly legible on mobile, with medium weight and comfortable line height.
- Tiny labels often use uppercase tracking to create structure inside otherwise soft layouts. Keep these labels small, airy, and understated.
- Numeric nutrition data should feel crisp and authoritative. Use strong weight and clear spacing so calorie and macro values become instant focal points.

## Layout & Spacing

The layout rhythm is based on an 8px-derived scale but should not feel rigid or mechanical. Eatrivo benefits from roomy spacing and clear separation between sections.

- Outer mobile padding should usually sit between 16px and 24px.
- Primary cards should have at least 24px internal padding, with 32px used for higher-emphasis or more editorial surfaces.
- Vertical stacking should feel breathable. Prefer larger section gaps over dense clusters.
- Controls are large and thumb-friendly by default. Tight desktop form density is not part of the core identity.
- The bottom navigation and floating center action need protected breathing room; content should never feel visually cramped against that zone.

## Elevation & Depth

Depth is soft and atmospheric, not dramatic. Most components sit on white surfaces with extremely diffused shadows. Purple appears in shadows only as a faint tint on emphasized controls, chat composer shells, and high-priority actions.

- Standard cards use wide, low-opacity shadows that gently separate them from the background.
- Elevated modals and onboarding sheets can use bigger blurrier shadows, sometimes with a faint violet cast.
- Decorative blur fields may appear behind hero content, chat screens, or tutorial surfaces, but they should stay subtle and washed out.
- Frosted or semi-translucent treatments are allowed for premium conversational surfaces, especially inputs and auxiliary side panels, but the default experience is still predominantly white and solid.

## Shapes

The shape language is rounded, tactile, and welcoming.

- Pill buttons, segmented controls, badges, and the floating chat button should use full rounding.
- Primary cards generally live at 24px radius.
- Premium or modal surfaces can push up to 32px radius.
- Smaller utility tiles and stat blocks can drop to 16px while staying visibly soft.
- Avoid sharp corners, rigid square chips, or highly angular icon framing.

## Components

Recipe cards are the signature content block. They should be large white panels with generous padding, one strong headline, a clear nutrition focal point, and small supporting stat tiles. Their structure should feel editorial and confidence-building rather than data-dense.

The bottom navigation is a defining interaction pattern. It uses a white dock with muted icons and a centered elevated chat action that visually breaks the baseline. The center action is the only element that should feel distinctly more playful and luminous than the rest of the shell.

Buttons should split into three families:

- Primary actions: purple or violet gradients, white text, pill silhouette, soft tinted shadow.
- Conversational actions: purple-to-pink gradients, slightly more glow, used for Rivo-related prompts and send actions.
- Secondary actions: white fill, low-contrast border, dark text, same generous rounding.

Inputs and chat composers should feel padded and safe. Prefer pill or extra-rounded containers, faint borders, translucent white fills where appropriate, and a focused purple ring that remains soft rather than aggressive.

Illustration is part of the system. The Rivo mascot, circular avatars, and rounded icon containers add warmth and should be integrated like friendly product furniture, not decorative afterthoughts.

## Do's and Don'ts

- Do keep the interface bright, airy, and mobile-native.
- Do use purple as the unmistakable brand signal for state and action.
- Do reserve gradients for moments of emphasis rather than making every surface colorful.
- Do favor large radii, clean card grouping, and comfortable touch targets.
- Do use subtle blur glows and tinted shadows only where they add softness.
- Do not introduce harsh dark themes, black cards, or high-contrast neon styling as the default identity.
- Do not replace the soft rounded geometry with sharp enterprise rectangles.
- Do not let pink or green overpower purple as the brand anchor.
- Do not crowd cards with excessive metadata or dense table-like layouts.