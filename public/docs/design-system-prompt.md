# Eatrivo Design System — Component Style Prompt

> Use this document as a **reference prompt / preset** when building new pages or components for Eatrivo. Every decision here is derived directly from the existing codebase — not invented rules.

---

## 1. Stack & Tooling

| Concern | Tool |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 (`@theme` token system) |
| Animations | Framer Motion (`motion`, `AnimatePresence`) |
| Icons | Lucide React |
| Toasts | Sonner (`toast.success / .error / .info`) |
| i18n | next-intl (`useTranslations`, `useLocale`) |
| Auth | next-auth (`useSession`) |
| UI Primitives | shadcn/ui (Button, Dialog, Select, Input, Skeleton, etc.) |
| Charts | Recharts (`AreaChart`, `ResponsiveContainer`, `Tooltip`) |

---

## 2. Brand Color Palette

Defined in `src/app/globals.css` via `@theme`. Always use the **Tailwind token names**, never raw hex values.

```
bg-eatrivo-purple   → #7B3FF2   (primary — CTA, active states, accent icons)
bg-eatrivo-pink     → #EC4899   (fats, secondary accents)
bg-eatrivo-green    → #22C55E   (success, protein, positive trends)
bg-eatrivo-orange   → #F97316   (warning-light, carbs)
bg-eatrivo-blue     → #3B82F6   (plans, info, feature icons)
bg-eatrivo-yellow   → #EAB308   (caution)
bg-eatrivo-red      → #EF4444   (destructive, error)
bg-eatrivo-white-primary   → #FAFAFA   (page background)
bg-eatrivo-white-secondary → #F3F4F6   (input surfaces)
bg-eatrivo-black-primary   → #333333   (body text)
bg-eatrivo-black-secondary → #6B7280   (captions, metadata)
```

### Semantic Usage Pattern

```
Calories     → text-eatrivo-purple / bg-eatrivo-purple/10
Protein      → text-eatrivo-green  / bg-eatrivo-green/10
Carbohydrates→ text-eatrivo-orange / bg-eatrivo-orange/10
Fats         → text-eatrivo-pink   / bg-eatrivo-pink/10
Feature icons→ text-blue-600       / bg-blue-50
Success state→ text-green-*        / bg-green-*
Error state  → text-red-*          / destructive token
```

---

## 3. Typography

Fonts are set in `@theme`:

```
--font-sans:    "Inter", "Public Sans", system-ui, sans-serif
--font-heading: "Public Sans", "Inter", system-ui, sans-serif
```

### Scale in Use

| Role | Classes |
|---|---|
| Page title | `text-2xl md:text-3xl font-bold text-gray-900` |
| Section heading | `text-xl font-bold text-gray-900` |
| Card heading | `text-lg font-semibold text-gray-900` |
| Body / description | `text-sm text-gray-600` or `text-gray-500` |
| Metadata / label | `text-xs text-gray-500` |
| Micro-label (caps) | `text-[10px] uppercase tracking-wider font-semibold text-gray-400` |
| Number/stat value | `text-lg font-bold {color-token}` |

---

## 4. Spacing System

All spacing uses Tailwind defaults. Common patterns:

```
Section vertical gap :  space-y-6  or  space-y-8
Grid gap             :  gap-4  /  gap-6  /  gap-8
Card internal padding:  p-4  /  p-6
Mobile header offset :  pt-20 md:pt-8
Mobile footer offset :  pb-24 md:pb-8
Horizontal padding   :  px-4 md:px-8
Max content width    :  max-w-7xl mx-auto
```

---

## 5. Card / Surface Pattern

The standard card used across every section:

```tsx
<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6">
  {/* content */}
</div>
```

Hover variant (subtle lift):
```tsx
className="... hover:border-gray-200 transition-colors"
```

Glow / active variant (e.g., CTA card):
```tsx
// Animated glow ring using absolute, -inset-[2px], blur-sm, group-hover:opacity-100
<div className="absolute -inset-[2px] rounded-2xl blur-sm opacity-0 group-hover:opacity-100
                transition-opacity duration-500 bg-eatrivo-purple/20" />
```

---

## 6. Icon Container Pattern

Used for section/feature icons:

```tsx
// Color-specific icon badge (blue example matching "Daily Plan")
<div className="p-2 bg-blue-50 rounded-lg">
  <ReceiptText className="w-5 h-5 text-blue-600" />
</div>

// Circular stat icon (used in nutrition, health widgets)
<div className={`w-8 h-8 md:w-10 md:h-10 rounded-full ${item.bg} flex items-center justify-center
                 group-hover:scale-110 transition-transform duration-300`}>
  <Icon className={`w-4 h-4 md:w-5 md:h-5 ${item.color}`} />
</div>

// Avatar fallback
<div className="w-12 h-12 rounded-full bg-eatrivo-purple/10 flex items-center justify-center">
  <User className="w-6 h-6 text-eatrivo-purple" />
</div>
```

---

## 7. Layout Architecture

### Desktop (≥ md)

```
┌──────────────────────────────────────────────────────┐
│  Sidebar (w-64, sticky, bg-white, border-r)          │
│  ├─ Logo                                              │
│  ├─ User avatar + badge                               │
│  └─ Nav items (icon + label)                          │
├──────────────────────────────────────────────────────┤
│  Main (flex-1, max-w-[calc(100vw-256px)], overflow-y)│
│  ├─ Welcome row (h1 + date + locale selector)         │
│  ├─ Section heading row (icon badge + h2 + nutrition) │
│  ├─ Main content (DailyMealPlan, etc.)                │
│  └─ lg:grid-cols-3                                    │
│       ├─ lg:col-span-2  → Shopping Lists              │
│       └─ col-span-1     → Health Circle + Tracker     │
└──────────────────────────────────────────────────────┘
```

### Mobile (< md)

```
┌─────────────────────────────┐
│  HomeHeader (fixed top)     │
├─────────────────────────────┤
│  Main (pt-20 pb-24)         │
│  (single-column stack)      │
│    order-1 → right widgets  │
│    order-2 → main content   │
└─────────────────────────────┘
│  MobileNavigation (fixed)   │
└─────────────────────────────┘
```

### Section Switching

Sections are rendered in one `<main>` via a state string (`"home" | "pantry" | "chatWithRivo" | "profile" | "mealGallery"`). The `chatWithRivo` section removes padding and disables scroll (`overflow-hidden p-0`). All others use `overflow-y-auto`.

---

## 8. Animation Conventions

### Standard fade-in variant (reuse across components)

```ts
const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
  transition: { duration: 0.4, ease: "easeOut" as const },
};
```

### Section transitions (AnimatePresence on the page level)

```tsx
<motion.div
  key="section-key"
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -10 }}
  transition={{ duration: 0.3 }}
>
```

### Spring physics (interactive cards / CTAs)

```tsx
// Entry
transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}

// Hover / tap
whileHover={{ scale: 1.02, y: -4 }}
whileTap={{ scale: 0.97 }}
```

### Sidebar entrance

```tsx
initial={{ x: -20, opacity: 0 }}
animate={{ x: 0, opacity: 1 }}
```

### Skeleton / Loading

Always use the shadcn `<Skeleton>` component. Use `AnimatePresence mode="wait"` to swap loading → content states.

### Reduced motion

```ts
const shouldReduceMotion = useReducedMotion(); // from framer-motion
// Pass {} to animation props when true
```

---

## 9. Loading & Async State Patterns

### Narrative loader (never a plain spinner)

When generating/fetching long operations, cycle through descriptive label keys with a 2–3 s interval:
```ts
const LOADER_KEYS = ["loader.scanning", "loader.optimizing", "loader.finishing"];
```

### Progress bar (SSE-backed generation)

Maintain a `displayProgress` state that:
- Snap-advances to `generationProgress` if it jumps ahead
- Adds `1–2 %` every 1.5 s so the bar always visibly moves
- Holds at `99 %` until the real `done` event fires

### Loading object pattern

```ts
const [isLoading, setIsLoading] = useState({ shoppingLists: true, mealPlans: true });
// Set per-key: setIsLoading(prev => ({ ...prev, shoppingLists: false }))
```

---

## 10. Interactive Component Patterns

### Primary CTA button

```tsx
<Button className="bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white rounded-full px-6">
  Generate
</Button>
```

### Locale / Select (minimal trigger)

```tsx
<SelectTrigger
  size="sm"
  className="h-9 w-[4.5rem] rounded-full border-transparent bg-transparent px-2
             shadow-none hover:bg-gray-100 focus:ring-eatrivo-purple/15"
>
```

### Online/offline status dot

```tsx
<div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
```

### Focus visible ring

```tsx
className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2"
```

### Keyboard-accessible card/button

```tsx
role="button"
tabIndex={0}
onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }}
```

---

## 11. Toast Notifications

All toasts go through `sonner`. Standard call patterns:

```ts
toast.success(t("toasts.mealPlanReady"), { duration: 3000 });
toast.error(t("toasts.shoppingListsLoadError"));
toast.info(t("pwa.offline.showingData"));
```

---

## 12. Hydration Safety

Components that depend on browser APIs or the current date must guard with `isMounted`:

```tsx
const [isMounted, setIsMounted] = useState(false);
useEffect(() => { setIsMounted(true); }, []);
if (!isMounted) return null; // or skeleton
```

---

## 13. Custom Tooltip (Recharts)

```tsx
const CustomTooltip = ({ active, payload }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-100">
        <p className="text-sm font-semibold text-gray-900">{payload[0].payload.value}</p>
        <p className="text-xs text-gray-500">{payload[0].payload.label}</p>
      </div>
    );
  }
  return null;
};
```

---

## 14. New Component Checklist

When building a new Eatrivo component, verify:

- [ ] `"use client"` directive if it uses state/effects
- [ ] Colors from the `eatrivo-*` token set (no raw hex)
- [ ] `rounded-2xl`, `shadow-sm`, `border border-gray-100` on card surfaces
- [ ] `framer-motion` enter/exit with `fadeIn` variant or custom spring
- [ ] `AnimatePresence` wrapping loading ↔ content transitions
- [ ] `useReducedMotion()` respected — pass `{}` to animation props when true
- [ ] Skeleton placeholders that **match the shape** of the real content
- [ ] `useTranslations` for all user-visible strings (no hardcoded EN copy in JSX)
- [ ] `toast.error` on fetch failures, `toast.success` on completion
- [ ] Section heading uses `p-2 bg-{color}-50 rounded-lg` icon badge pattern
- [ ] Mobile-first: single column stacking, responsive grid upgrades at `md:` / `lg:`
- [ ] `isMounted` guard for anything touching `Date`, `window`, or `localStorage`
- [ ] Keyboard navigation (`tabIndex`, `onKeyDown`) on non-`<button>` interactive elements
- [ ] `focus-visible:ring-2 focus-visible:ring-purple-400` on interactive elements

---

## 15. Quick Copy — Standard Section Shell

```tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { SomeIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

const fadeIn = {
  initial:    { opacity: 0, y: 12 },
  animate:    { opacity: 1, y: 0 },
  exit:       { opacity: 0, y: -8 },
  transition: { duration: 0.4, ease: "easeOut" as const },
};

export default function MySection() {
  const t = useTranslations("home");
  const shouldReduceMotion = useReducedMotion();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<null | any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/my-endpoint");
        if (!res.ok) throw new Error();
        setData(await res.json());
      } catch {
        toast.error(t("errors.loadFailed"));
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <section className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-50 rounded-lg">
          <SomeIcon className="w-5 h-5 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">{t("mySection.title")}</h2>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="loading" {...(shouldReduceMotion ? {} : fadeIn)}>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </motion.div>
        ) : (
          <motion.div key="content" {...(shouldReduceMotion ? {} : fadeIn)}>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              {/* your content */}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
```
