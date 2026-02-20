# Nutrition Data Validation Comparison

## Profile Nutrition Editing vs Onboarding Nutrition

This document compares data validation between the **Profile Nutrition Editing** page and the **Onboarding Nutrition** page.

---

## 🔍 Key Findings

### 1. **Schema Validation Approach**

#### Profile Nutrition Editing
```tsx
// Custom inline schema with useMemo
const nutritionSchema = useMemo(
  () => z.object({
    sex: z.enum(["man", "woman"]),
    height: z.number().min(100).max(250),
    weight: z.string().min(2),  // ⚠️ STRING TYPE
    // ... all fields REQUIRED except likes, dislikes, allergies
  }),
  [t]
);
```

#### Onboarding Nutrition
```tsx
// Uses shared schema: userFoodPreferencesSchema
import { userFoodPreferencesSchema } from "@/lib/schemas/user";
```

**Issue**: Different schemas mean different validation rules for the same data!

---

### 2. **Critical Differences**

| Field | Profile Page | Onboarding Page | Issue |
|-------|-------------|----------------|-------|
| **weight** | `z.string().min(2)` | `z.number().min(30).max(300)` | ⚠️ **Type mismatch** |
| **activity_level** | `z.string().min(1)` + Required | `z.enum([...])` + Required | ✅ Different validation |
| **goal** | `z.string().min(1)` + Required | `z.enum([...]).optional()` | ⚠️ **Required vs Optional** |
| **meal_per_day** | `z.number().min(1).max(6)` + Required | `z.number().min(1).max(10).optional()` | ⚠️ **Different max & optionality** |
| **cooking_time_pref** | `z.string().min(1)` + Required | `z.enum([...]).optional()` | ⚠️ **Required vs Optional** |
| **diet_preferences** | `z.string().min(1)` + Required | `z.enum([...]).optional()` | ⚠️ **Required vs Optional** |
| **budget_preference** | `z.string().min(1)` + Required | `z.enum([...]).optional()` | ⚠️ **Required vs Optional** |
| **meal_prep** | ❌ Not present | `z.boolean().optional()` | ⚠️ **Missing field** |
| **meal_prep_days** | ❌ Not present | `z.number().min(1).max(7).optional()` | ⚠️ **Missing field** |

---

## 🚨 Major Issues

### 1. Weight Field Type Mismatch
**Onboarding**: Saves as `number` (30-300)
**Profile**: Validates as `string` with min length 2

**Consequence**: 
- User can set weight as "70" during onboarding
- When editing profile, validation expects string like "70"
- Database stores different types
- Potential parsing errors

### 2. Required vs Optional Inconsistency
**Onboarding**: Most fields are optional
**Profile**: Almost all fields are required

**Consequence**: 
- User can skip fields during onboarding
- Cannot save profile later without filling all fields
- Data integrity issues

### 3. Missing Meal Prep Fields
**Onboarding**: Collects `meal_prep` and `meal_prep_days`
**Profile**: Cannot edit these fields later

**Consequence**: 
- User sets meal prep during onboarding
- Cannot change preference in profile
- Permanent decision

### 4. Different Max Values
**meal_per_day**: Profile allows 1-6, Onboarding allows 1-10

**Consequence**: 
- User can set 8 meals during onboarding
- Profile validation would reject it
- Cannot update valid data

---

## 📊 Schema Comparison

### Profile Nutrition Schema (Inline)
```typescript
const nutritionSchema = z.object({
  sex: z.enum(["man", "woman"]),
  height: z.number().min(100, "min 100cm").max(250, "max 250cm"),
  weight: z.string().min(2, "required"),  // ⚠️ STRING
  activity_level: z.string().min(1, "required"),  // ⚠️ NOT ENUM
  goal: z.string().min(1, "required"),  // ⚠️ REQUIRED
  meal_per_day: z.number().min(1).max(6),  // ⚠️ REQUIRED, max 6
  cooking_time_pref: z.string().min(1, "required"),  // ⚠️ REQUIRED
  diet_preferences: z.string().min(1, "required"),  // ⚠️ REQUIRED
  budget_preference: z.string().min(1, "required"),  // ⚠️ REQUIRED
  likes: z.string().optional(),
  dislikes: z.string().optional(),
  allergies: z.string().optional(),
});
```

### Onboarding Nutrition Schema (Shared)
```typescript
export const userFoodPreferencesSchema = z.object({
  sex: z.enum(["man", "woman"], { message: "required" }),
  height: z.number().min(100, "min 100cm").max(250, "max 250cm"),
  weight: z.number().min(30, "min 30kg").max(300, "max 300kg"),  // ✅ NUMBER
  activity_level: z.enum([...], { message: "required" }),  // ✅ ENUM
  meal_per_day: z.number().min(1).max(10).optional(),  // ✅ OPTIONAL, max 10
  cooking_time_pref: z.enum([...]).optional(),  // ✅ OPTIONAL
  meal_prep: z.boolean().default(false).optional(),  // ✅ EXISTS
  meal_prep_days: z.number().min(1).max(7).optional(),  // ✅ EXISTS
  goal: z.enum([...]).default("maintain_weight").optional(),  // ✅ OPTIONAL
  diet_preferences: z.enum([...]).default("none").optional(),  // ✅ OPTIONAL
  budget_preference: z.enum([...]).default("medium").optional(),  // ✅ OPTIONAL
  likes: z.string().max(500).optional(),
  dislikes: z.string().max(500).optional(),
  allergies: z.string().max(500).optional(),
});
```

---

## ✅ Recommendations

### 1. **Use Shared Schema** (CRITICAL)
Both pages should use `userFoodPreferencesSchema` from `src/lib/schemas/user.ts`

```tsx
// ❌ BAD: Profile page creates custom schema
const nutritionSchema = useMemo(() => z.object({...}), [t]);

// ✅ GOOD: Profile page uses shared schema
import { userFoodPreferencesSchema } from "@/lib/schemas/user";
```

### 2. **Fix Weight Type** (CRITICAL)
Profile page must accept number, not string:
```tsx
// ❌ Current
weight: z.string().min(2)

// ✅ Should be
weight: z.number().min(30).max(300)
```

### 3. **Add Meal Prep Fields** (HIGH)
Profile page should allow editing meal prep:
```tsx
<FormField name="meal_prep" />
<FormField name="meal_prep_days" />
```

### 4. **Align Validation Rules** (MEDIUM)
Either:
- Make all fields optional in both (recommended)
- Make all fields required in both

### 5. **Use Enums Consistently** (MEDIUM)
Profile should use enums for:
- `activity_level`
- `goal`
- `cooking_time_pref`
- `diet_preferences`
- `budget_preference`

---

## 🛠️ Implementation Plan

### Phase 1: Critical Fixes
1. Replace inline schema with `userFoodPreferencesSchema` in NutritionPreferencesSection
2. Fix weight field to accept number type
3. Add proper type conversion when loading existing data

### Phase 2: Feature Parity
1. Add meal_prep toggle to profile page
2. Add meal_prep_days conditional field
3. Test data flow: onboarding → database → profile edit

### Phase 3: Validation Alignment
1. Review which fields should be required vs optional
2. Update schema in `/src/lib/schemas/user.ts`
3. Ensure consistent max/min values across all fields

---

## 📝 Testing Checklist

After implementing fixes:

- [ ] User completes onboarding with meal_prep = true
- [ ] User saves weight as number (e.g., 70)
- [ ] User can view profile nutrition page without errors
- [ ] User can edit all nutrition fields
- [ ] User can toggle meal_prep on/off
- [ ] Weight validates as number (not string)
- [ ] All enum fields show correct dropdown options
- [ ] Optional fields can be cleared
- [ ] Form validation messages match between pages
- [ ] Database saves correct data types

---

## 📎 Files to Modify

1. **`/src/app/profile/components/NutritionPreferencesSection.tsx`**
   - Remove inline schema
   - Import `userFoodPreferencesSchema`
   - Add meal_prep fields
   - Fix weight type handling

2. **`/src/lib/schemas/user.ts`** (if needed)
   - Review and adjust required vs optional fields
   - Ensure validation messages are translatable

3. **Database schema** (verify)
   - Ensure weight column accepts number type
   - Ensure meal_prep columns exist

---

## 🔗 Related Files

- Onboarding: `/src/app/onboarding/components/FoodPreferences.tsx`
- Profile: `/src/app/profile/components/NutritionPreferencesSection.tsx`
- Schema: `/src/lib/schemas/user.ts`
- API endpoints:
  - POST `/api/onboarding/post`
  - PUT `/api/user/nutrition`
  - GET `/api/user/profile`
