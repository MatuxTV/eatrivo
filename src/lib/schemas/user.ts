import { get } from "http";
import { z } from "zod";
import { getAgeFromDate } from "../functions";

// User profile onboarding schema (after Google OAuth)
export const userProfileOnboardingSchema = z.object({
  fullName: z.string().min(2, "Celé meno musí mať aspoň 2 znaky").max(100, "Celé meno je príliš dlhé"),
  username: z.string().min(3, "Používateľské meno musí mať aspoň 3 znaky").max(20, "Používateľské meno je príliš dlhé").regex(/^[a-zA-Z0-9_]+$/, "Používateľské meno môže obsahovať len písmená, čísla a podčiarkovníky"),
  dateOfBirth: z.string()
    .min(1, "Dátum narodenia je povinný")
    .refine((date) => {
      const age = getAgeFromDate(date);
      return age >= 13
    }, "Musíte mať aspoň 13 rokov"),
});

// User food preferences schema (second step)
export const userFoodPreferencesSchema = z.object({
  sex: z.enum(["man", "woman"], {
    message: "Prosím vyberte svoje pohlavie"
  }),
  age: z.number().min(13, "Musíte mať aspoň 13 rokov").max(120, "Zadajte platný vek"),
  height: z.number().min(100, "Výška musí byť aspoň 100cm").max(250, "Výška nemôže presiahnuť 250cm"),
  weight: z.number().min(30, "Hmotnosť musí byť aspoň 30kg").max(300, "Hmotnosť nemôže presiahnuť 300kg"),
  activity_level: z.enum(["sedentary", "lightly_active", "moderately_active", "very_active", "athlete"], {
    message: "Prosím vyberte svoju úroveň aktivity"
  }),
  meal_per_day: z.number().min(1, "Aspoň 1 jedlo denne").max(10, "Maximálne 10 jedál denne").optional(),
  cooking_time_pref: z.enum(["quick", "normal", "slow"], {
    message: "Prosím vyberte svoju preferenciu času varenia"
  }).optional(),
  goal: z.enum(["lose_weight", "maintain_weight", "gain_muscle"]).default("maintain_weight").optional(),
  diet_preferences: z.enum(["none", "lactosefree", "vegetarian", "vegan", "pescatarian", "ketogenic", "paleolithic"]).default("none").optional(),
  budget_preference: z.enum(["low", "medium", "high"]).default("medium").optional(),
  likes: z.string().max(500, "Popis obľúbených jedál je príliš dlhý").optional(),
  dislikes: z.string().max(500, "Popis neobľúbených jedál je príliš dlhý").optional(),
  allergies: z.string().max(500, "Popis alergií je príliš dlhý").optional(),
});

// Complete onboarding schema (combines both steps)
export const completeOnboardingSchema = z.object({
  profile: userProfileOnboardingSchema,
  foodPreferences: userFoodPreferencesSchema,
});

// Schema for updating user profile
export const updateUserProfileSchema = z.object({
  fullName: z.string().min(2, "Celé meno musí mať aspoň 2 znaky").max(100, "Celé meno je príliš dlhé").optional(),
  username: z.string().min(3, "Používateľské meno musí mať aspoň 3 znaky").max(20, "Používateľské meno je príliš dlhé").regex(/^[a-zA-Z0-9_]+$/, "Používateľské meno môže obsahovať len písmená, čísla a podčiarkovníky").optional(),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, "Neplatný formát telefónneho čísla").optional(),
  dateOfBirth: z.date().max(new Date(), "Dátum narodenia nemôže byť v budúcnosti").optional(),
});

export const userProfileForAIInsightsSchema = z.object({
  fullName: z.string().min(2, "Celé meno musí mať aspoň 2 znaky").max(100, "Celé meno je príliš dlhé").optional(),
  username: z.string().min(3, "Používateľské meno musí mať aspoň 3 znaky").max(20, "Používateľské meno je príliš dlhé").regex(/^[a-zA-Z0-9_]+$/, "Používateľské meno môže obsahovať len písmená, čísla a podčiarkovníky").optional(),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, "Neplatný formát telefónneho čísla").optional(),
  dateOfBirth: z.date().max(new Date(), "Dátum narodenia nemôže byť v budúcnosti").optional(),
});

// Schema for updating food preferences
export const updateFoodPreferencesSchema = userFoodPreferencesSchema.partial();

// Type exports for your app
export type UserProfileOnboarding = z.infer<typeof userProfileOnboardingSchema>;
export type UserFoodPreferences = z.infer<typeof userFoodPreferencesSchema>;
export type CompleteOnboarding = z.infer<typeof completeOnboardingSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type UpdateFoodPreferences = z.infer<typeof updateFoodPreferencesSchema>;

// Helper schemas for form steps
export const onboardingStep1Schema = userProfileOnboardingSchema;
export const onboardingStep2Schema = userFoodPreferencesSchema;