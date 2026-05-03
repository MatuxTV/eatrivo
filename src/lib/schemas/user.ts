import { z } from "zod";
import { getAgeFromDate } from "../utils/functions";

const requiredNumberSchema = () =>
  z.number({
    error: (issue) => {
      if (issue.input === undefined || Number.isNaN(issue.input)) {
        return "Musíte mať zadané číslo";
      }

      return undefined;
    },
  });

// User profile onboarding schema (after Google OAuth)
export const userProfileOnboardingSchema = z.object({
  fullName: z
    .string()
    .min(2, "Celé meno musí mať aspoň 2 znaky")
    .max(100, "Celé meno je príliš dlhé"),
  dateOfBirth: z
    .string()
    .min(1, "Dátum narodenia je povinný")
    .refine((date) => {
      const age = getAgeFromDate(date);
      return age >= 13;
    }, "Musíte mať aspoň 13 rokov"),
  language: z.enum(["sk", "en"]).default("sk"),
});

// User food preferences schema (second step)
export const userFoodPreferencesSchema = z.object({
  sex: z.enum(["man", "woman"], {
    message: "Prosím vyberte svoje pohlavie",
  }),
  height: requiredNumberSchema()
    .min(100, "Výška musí byť aspoň 100cm")
    .max(250, "Výška nemôže presiahnuť 250cm"),
  weight: requiredNumberSchema()
    .min(30, "Hmotnosť musí byť aspoň 30kg")
    .max(300, "Hmotnosť nemôže presiahnuť 300kg"),
  activity_level: z.enum(
    [
      "sedentary",
      "lightly_active",
      "moderately_active",
      "very_active",
      "athlete",
    ],
    {
      message: "Prosím vyberte svoju úroveň aktivity",
    },
  ),
  meal_per_day: requiredNumberSchema()
    .min(1, "Aspoň 1 jedlo denne")
    .max(6, "Maximálne 6 jedál denne"),
  cooking_time_pref: z.enum(["quick", "normal", "slow"], {
    message: "Prosím vyberte svoju preferenciu času varenia",
  }),
  meal_prep: z.boolean().default(false).optional(),
  meal_prep_days: requiredNumberSchema()
    .min(1, "Minimálne 1 deň")
    .max(7, "Maximálne 7 dní")
    .optional(),
  goal: z.enum(["lose_weight", "maintain_weight", "gain_muscle"], {
    message: "Prosím vyberte svoj cieľ",
  }),
  diet_preferences: z.enum(
    [
      "none",
      "lactosefree",
      "vegetarian",
      "vegan",
      "pescatarian",
      "ketogenic",
      "paleolithic",
    ],
    {
      message: "Prosím vyberte svoju diétnu preferenciu",
    },
  ),
  budget_preference: z.enum(["low", "medium", "high"], {
    message: "Prosím vyberte svoju rozpočtovú preferenciu",
  }),
  likes: z
    .string()
    .max(500, "Popis obľúbených jedál je príliš dlhý")
    .optional(),
  dislikes: z
    .string()
    .max(500, "Popis neobľúbených jedál je príliš dlhý")
    .optional(),
  allergies: z.string().max(500, "Popis alergií je príliš dlhý").optional(),
});

// Complete onboarding schema (combines both steps)
export const completeOnboardingSchema = z.object({
  profile: userProfileOnboardingSchema,
  foodPreferences: userFoodPreferencesSchema,
  consents: z.object({
    termsAndPrivacy: z.literal(true, {
      error: "You must agree to the Terms and Privacy Policy",
    }),
    medicalDisclaimer: z.literal(true, {
      error: "You must acknowledge the Medical Disclaimer",
    }),
    healthDataProcessing: z.literal(true, {
      error: "You must consent to health data processing",
    }),
  }),
});

// Schema for updating user profile
export const updateUserProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, "Celé meno musí mať aspoň 2 znaky")
    .max(100, "Celé meno je príliš dlhé")
    .optional(),
  dateOfBirth: z
    .date()
    .max(new Date(), "Dátum narodenia nemôže byť v budúcnosti")
    .optional(),
  isEmailSubscriptionActive: z.boolean().optional(),
});

export const userProfileForAIInsightsSchema = z.object({
  fullName: z
    .string()
    .min(2, "Celé meno musí mať aspoň 2 znaky")
    .max(100, "Celé meno je príliš dlhé")
    .optional(),
  username: z
    .string()
    .min(3, "Používateľské meno musí mať aspoň 3 znaky")
    .max(20, "Používateľské meno je príliš dlhé")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Používateľské meno môže obsahovať len písmená, čísla a podčiarkovníky",
    )
    .optional(),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-\(\)]+$/, "Neplatný formát telefónneho čísla")
    .optional(),
  dateOfBirth: z
    .date()
    .max(new Date(), "Dátum narodenia nemôže byť v budúcnosti")
    .optional(),
});

// Schema for updating food preferences
export const updateFoodPreferencesSchema = userFoodPreferencesSchema.partial();

// Type exports for your app
export type UserProfileOnboarding = z.infer<typeof userProfileOnboardingSchema>;
export type UserProfileOnboardingFormValues = z.input<
  typeof userProfileOnboardingSchema
>;
export type UserFoodPreferences = z.infer<typeof userFoodPreferencesSchema>;
export type CompleteOnboarding = z.infer<typeof completeOnboardingSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type UpdateFoodPreferences = z.infer<typeof updateFoodPreferencesSchema>;

// Helper schemas for form steps
export const onboardingStep1Schema = userProfileOnboardingSchema;
export const onboardingStep2Schema = userFoodPreferencesSchema;
