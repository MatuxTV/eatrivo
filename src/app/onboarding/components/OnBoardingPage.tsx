"use client";

import type { z } from "zod";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  userFoodPreferencesSchema,
  userProfileOnboardingSchema,
  type UserProfileOnboarding,
  type UserFoodPreferences,
} from "../../../lib/schemas/user";
import { trackClientEvent } from "@/lib/analytics/analytics-client";
import { logger } from "@/lib/logger";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  ChevronLeft,
  Dumbbell,
  Heart,
  Ruler,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  User,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

interface OnboardingClientProps {
  userEmail?: string;
}

interface OnboardingConsents {
  termsAndPrivacy: boolean;
  medicalDisclaimer: boolean;
  healthDataProcessing: boolean;
}

const TOTAL_STEPS = 6;

const ALLERGY_SUGGESTIONS = [
  "eggs",
  "fish",
  "gluten",
  "dairy",
  "nuts",
  "shellfish",
  "soy",
  "seeds",
  "seafood",
  "citrusFruits",
  "animalProducts",
  "redMeat",
  "allMeat",
] as const;

const wizardSchema = userProfileOnboardingSchema.and(userFoodPreferencesSchema);
type OnboardingWizardValues = z.input<typeof wizardSchema>;

const parseCommaList = (value?: string) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export default function OnboardingClient({ userEmail }: OnboardingClientProps) {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [consents, setConsents] = useState<OnboardingConsents>({
    termsAndPrivacy: false,
    medicalDisclaimer: false,
    healthDataProcessing: false,
  });
  const [showConsentError, setShowConsentError] = useState(false);

  const form = useForm<OnboardingWizardValues>({
    resolver: zodResolver(wizardSchema),
    mode: "onChange",
    defaultValues: {
      fullName: "",
      dateOfBirth: "",
      language: locale === "en" ? "en" : "sk",
      sex: undefined,
      height: 170,
      weight: 70,
      activity_level: undefined,
      meal_per_day: 3,
      cooking_time_pref: "normal",
      meal_prep: false,
      meal_prep_days: undefined,
      goal: "maintain_weight",
      diet_preferences: "none",
      budget_preference: "medium",
      likes: "",
      dislikes: "",
      allergies: "",
    },
  });

  const watchedAllergies = form.watch("allergies");
  const selectedAllergies = useMemo(
    () => parseCommaList(watchedAllergies).map((item) => item.toLowerCase()),
    [watchedAllergies],
  );

  const stepFields: Record<number, Array<keyof OnboardingWizardValues>> = {
    1: ["fullName", "dateOfBirth"],
    2: ["sex"],
    3: ["height", "weight"],
    4: ["activity_level", "goal"],
    5: ["diet_preferences"],
    6: ["likes", "dislikes", "allergies"],
  };

  const stepMeta = [
    {
      title: t("wizard.nameDob.title"),
      description: t("wizard.nameDob.description"),
      eyebrow: t("steps.name"),
    },
    {
      title: t("wizard.gender.title"),
      description: t("wizard.gender.description"),
      eyebrow: t("steps.gender"),
    },
    {
      title: t("wizard.metrics.title"),
      description: t("wizard.metrics.description"),
      eyebrow: t("steps.metrics"),
    },
    {
      title: t("wizard.lifestyle.title"),
      description: t("wizard.lifestyle.description"),
      eyebrow: t("steps.lifestyle"),
    },
    {
      title: t("wizard.diet.title"),
      description: t("wizard.diet.description"),
      eyebrow: t("steps.diet"),
    },
    {
      title: t("wizard.finish.title"),
      description: t("wizard.finish.description"),
      eyebrow: t("steps.finish"),
    },
  ];

  const allConsentsGiven =
    consents.termsAndPrivacy &&
    consents.medicalDisclaimer &&
    consents.healthDataProcessing;

  const stepperItems = [
    { icon: User, label: t("steps.name") },
    { icon: Sparkles, label: t("steps.gender") },
    { icon: Ruler, label: t("steps.metrics") },
    { icon: Activity, label: t("steps.lifestyle") },
    { icon: Heart, label: t("steps.diet") },
    { icon: ShieldCheck, label: t("steps.finish") },
  ];

  useEffect(() => {
    form.setValue("language", locale === "en" ? "en" : "sk", {
      shouldValidate: true,
    });
  }, [form, locale]);

  useEffect(() => {
    trackClientEvent({
      eventName: "onboarding_started",
      metadata: {
        locale,
        entrypoint: "onboarding_page",
      },
    });
  }, [locale]);

  useEffect(() => {
    trackClientEvent({
      eventName: "onboarding_step_viewed",
      metadata: {
        locale,
        step_name: `step_${currentStep}`,
        step_index: currentStep,
      },
    });
  }, [currentStep, locale]);

  const completeOnboarding = async (values: OnboardingWizardValues) => {
    if (!allConsentsGiven) {
      setShowConsentError(true);
      return;
    }

    setIsLoading(true);

    try {
      const profile = userProfileOnboardingSchema.parse({
        fullName: values.fullName,
        dateOfBirth: values.dateOfBirth,
        language: values.language,
      });

      const foodPreferences = userFoodPreferencesSchema.parse({
        sex: values.sex,
        height: values.height,
        weight: values.weight,
        activity_level: values.activity_level,
        meal_per_day: values.meal_per_day,
        cooking_time_pref: values.cooking_time_pref,
        meal_prep: values.meal_prep,
        meal_prep_days: values.meal_prep_days,
        goal: values.goal,
        diet_preferences: values.diet_preferences,
        budget_preference: values.budget_preference,
        likes: values.likes,
        dislikes: values.dislikes,
        allergies: values.allergies,
      });

      const response = await fetch("/api/onboarding/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profile,
          foodPreferences,
          consents: {
            termsAndPrivacy: consents.termsAndPrivacy,
            medicalDisclaimer: consents.medicalDisclaimer,
            healthDataProcessing: consents.healthDataProcessing,
          },
        }),
      });

      if (response.ok) {
        trackClientEvent({
          eventName: "onboarding_step_completed",
          metadata: {
            locale,
            step_name: "step_6",
            step_index: TOTAL_STEPS,
          },
        });

        trackClientEvent({
          eventName: "onboarding_completed",
          metadata: {
            locale,
            profile_created: true,
          },
        });

        // Send welcome email after successful onboarding (non-blocking)
        if (userEmail && profile.fullName) {
          try {
            await fetch("/api/send-email", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                type: "welcome",
                to: userEmail,
                userName: profile.fullName,
              }),
            });
            logger.info(`Welcome email sent successfully to ${userEmail}`, {
              context: "OnBoardingPage",
            });
          } catch (emailError) {
            logger.error(`Failed to send welcome email to ${userEmail}`, emailError, {
              context: "OnBoardingPage",
            });
            // Don't block dashboard redirect if email fails
          }
        } else {
          logger.warn("User email or name not available for welcome email", {
            context: "OnBoardingPage",
          });
        }

        // Redirect to home
        router.push("/home");
      } else {
        throw new Error("Failed to save onboarding data");
      }
    } catch (error) {
      trackClientEvent({
        eventName: "onboarding_save_failed",
        metadata: {
          locale,
          step_name: `step_${currentStep}`,
        },
      });

      logger.error("Error saving onboarding", error, {
        context: "OnBoardingPage"
      });
      alert(t("errors.saveFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = async () => {
    const isValid = await form.trigger(stepFields[currentStep], {
      shouldFocus: true,
    });

    if (!isValid) {
      return;
    }

    trackClientEvent({
      eventName: "onboarding_step_completed",
      metadata: {
        locale,
        step_name: `step_${currentStep}`,
        step_index: currentStep,
      },
    });

    setCurrentStep((step) => Math.min(step + 1, TOTAL_STEPS));
  };

  const handlePrevious = () => {
    setCurrentStep((step) => Math.max(step - 1, 1));
  };

  const toggleAllergy = (allergyLabel: string) => {
    const currentItems = parseCommaList(form.getValues("allergies"));
    const normalized = allergyLabel.toLowerCase();
    const alreadySelected = currentItems.some(
      (item) => item.toLowerCase() === normalized,
    );

    const nextItems = alreadySelected
      ? currentItems.filter((item) => item.toLowerCase() !== normalized)
      : [...currentItems, allergyLabel];

    form.setValue("allergies", nextItems.join(", "), {
      shouldDirty: true,
      shouldValidate: currentStep === 6,
    });
  };

  const renderFieldError = (fieldName: keyof OnboardingWizardValues) => {
    const message = form.formState.errors[fieldName]?.message;

    if (!message) {
      return null;
    }

    return <p className="mt-2 text-sm text-eatrivo-red">{String(message)}</p>;
  };

  const activeStep = stepMeta[currentStep - 1];
  const fieldLabelClass = "mb-2 block text-sm font-semibold text-eatrivo-black-primary";
  const inputSurfaceClass =
    "h-14 rounded-[16px] border-eatrivo-black-primary/10 bg-white px-4 text-base text-eatrivo-black-primary shadow-none focus-visible:border-eatrivo-purple focus-visible:ring-eatrivo-purple/20";
  const textareaSurfaceClass =
    "min-h-[100px] rounded-[16px] border-eatrivo-black-primary/10 bg-white px-4 py-4 text-base text-eatrivo-black-primary shadow-none focus-visible:border-eatrivo-purple focus-visible:ring-eatrivo-purple/20";

  return (
    <div className="min-h-screen bg-eatrivo-white-primary text-eatrivo-black-primary">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-6 pt-5 sm:px-6">
        <header className="mb-6 flex flex-col">
          <div className="mb-5 flex items-center justify-between ">
            <div className="flex flex-1 justify-center">
              <Image
                src="/logo/LOGO_ROW.png"
                alt="Eatrivo"
                width={110}
                height={30}
                priority
                className="h-auto w-[7.5rem]"
              />
            </div>
          </div>
          <div className="rounded-[28px] border border-eatrivo-black-primary/10 bg-white px-3 py-4 shadow-sm">
            <div className="relative">
              <div className="absolute left-[calc(8.333%-0.125rem)] right-[calc(8.333%-0.125rem)] top-5 h-1 rounded-full bg-eatrivo-black-primary/8" />
              <motion.div
                className="absolute left-[calc(8.333%-0.125rem)] top-5 h-1 rounded-full bg-primary"
                initial={false}
                animate={{ width: `${((currentStep - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />

              <div className="relative grid grid-cols-6 gap-1">
                {stepperItems.map((step, index) => {
                  const isActive = index + 1 <= currentStep;
                  const Icon = step.icon;

                  return (
                    <div key={step.label} className="flex flex-col items-center text-center">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                          isActive
                            ? "border-primary bg-primary text-white shadow-md shadow-eatrivo-purple/20"
                            : "border-eatrivo-black-primary/10 bg-eatrivo-white-primary text-eatrivo-purple"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="mt-2 text-[10px] font-medium leading-3 text-eatrivo-black-secondary">
                        {step.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </header>

        <main className="flex flex-1 flex-col">
          <motion.section
            layout
            className="rounded-[30px] border border-eatrivo-black-primary/8 bg-white px-5 pb-6 pt-7 shadow-sm"
          >
            <div>
              <div className="mb-7">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-eatrivo-purple">
                  {activeStep.eyebrow}
                </p>
                <h1 className="mt-3 text-[2.2rem] font-black leading-[1.02] tracking-[-0.04em] text-eatrivo-black-primary">
                  {activeStep.title}
                </h1>
                <p className="mt-3 max-w-[19rem] text-[15px] leading-6 text-eatrivo-black-secondary">
                  {activeStep.description}
                </p>
              </div>

              <form onSubmit={form.handleSubmit(completeOnboarding)} className="flex flex-1 flex-col">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="space-y-5"
                  >
                    {currentStep === 1 && (
                      <div className="space-y-4">
                        <div>
                          <label className={fieldLabelClass}>
                            {t("profile.fullName")}
                          </label>
                          <Input
                            {...form.register("fullName")}
                            placeholder={t("profile.fullNamePlaceholder")}
                            className={inputSurfaceClass}
                          />
                          {renderFieldError("fullName")}
                        </div>

                        <div>
                          <label className={fieldLabelClass}>
                            {t("profile.dateOfBirth")}
                          </label>
                          <div className="relative">
                            <Calendar className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-eatrivo-purple" />
                            <Input
                              type="date"
                              max={new Date().toISOString().split("T")[0]}
                              {...form.register("dateOfBirth")}
                              className={`${inputSurfaceClass} pl-12`}
                            />
                          </div>
                          {renderFieldError("dateOfBirth")}
                        </div>
                      </div>
                    )}

                    {currentStep === 2 && (
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: "man", label: t("food.sexOptions.man") },
                          { value: "woman", label: t("food.sexOptions.woman") },
                        ].map((option) => {
                          const isActive = form.watch("sex") === option.value;

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => form.setValue("sex", option.value as UserFoodPreferences["sex"], { shouldValidate: true, shouldDirty: true })}
                              className={`rounded-[24px] border px-4 py-5 text-left transition ${
                                isActive
                                  ? "border-eatrivo-purple bg-eatrivo-purple/5"
                                  : "border-eatrivo-black-primary/10 bg-white"
                              }`}
                            >
                              <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-eatrivo-white-primary ${isActive ? "text-eatrivo-purple" : "text-eatrivo-black-secondary"}`}>
                                <User className="h-5 w-5" />
                              </div>
                              <p className="text-base font-semibold text-eatrivo-black-primary">{option.label}</p>
                            </button>
                          );
                        })}
                        <div className="col-span-2">{renderFieldError("sex")}</div>
                      </div>
                    )}

                    {currentStep === 3 && (
                      <div className="space-y-4">
                        <div>
                          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-eatrivo-black-primary">
                            <Ruler className="h-4 w-4 text-eatrivo-purple" />
                            {t("food.height")}
                          </label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            {...form.register("height", {
                              setValueAs: (value) => {
                                if (value === "") {
                                  return undefined;
                                }

                                const parsed = Number(value);
                                return Number.isNaN(parsed) ? undefined : parsed;
                              },
                            })}
                            placeholder={t("food.heightPlaceholder")}
                            className={inputSurfaceClass}
                          />
                          {renderFieldError("height")}
                        </div>
                        <div>
                          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-eatrivo-black-primary">
                            <Scale className="h-4 w-4 text-eatrivo-purple" />
                            {t("food.weight")}
                          </label>
                          <Input
                            type="number"
                            step="0.1"
                            inputMode="decimal"
                            {...form.register("weight", {
                              setValueAs: (value) => {
                                if (value === "") {
                                  return undefined;
                                }

                                const parsed = Number(value);
                                return Number.isNaN(parsed) ? undefined : parsed;
                              },
                            })}
                            placeholder={t("food.weightPlaceholder")}
                            className={inputSurfaceClass}
                          />
                          {renderFieldError("weight")}
                        </div>
                      </div>
                    )}

                    {currentStep === 4 && (
                      <div className="space-y-5">
                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-eatrivo-black-primary">{t("food.activityLevel")}</p>
                          {[
                            { value: "sedentary", label: t("food.activityOptions.sedentary") },
                            { value: "lightly_active", label: t("food.activityOptions.lightlyActive") },
                            { value: "moderately_active", label: t("food.activityOptions.moderatelyActive") },
                            { value: "very_active", label: t("food.activityOptions.veryActive") },
                            { value: "athlete", label: t("food.activityOptions.athlete") },
                          ].map((option) => {
                            const isActive = form.watch("activity_level") === option.value;

                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => form.setValue("activity_level", option.value as UserFoodPreferences["activity_level"], { shouldValidate: true, shouldDirty: true })}
                                className={`flex w-full items-center gap-3 rounded-[18px] border px-4 py-4 text-left transition ${
                                  isActive
                                    ? "border-eatrivo-green bg-eatrivo-green/10"
                                    : "border-eatrivo-black-primary/10 bg-white"
                                }`}
                              >
                                <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-white ${isActive ? "text-eatrivo-green" : "text-eatrivo-black-secondary"}`}>
                                  <Activity className="h-4 w-4" />
                                </div>
                                <span className="text-sm font-medium text-eatrivo-black-primary">{option.label}</span>
                              </button>
                            );
                          })}
                          {renderFieldError("activity_level")}
                        </div>

                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-eatrivo-black-primary">{t("food.goal")}</p>
                          <div className="grid grid-cols-1 gap-3">
                            {[
                              { value: "lose_weight", label: t("food.goalOptions.loseWeight"), icon: Target },
                              { value: "maintain_weight", label: t("food.goalOptions.maintainWeight"), icon: Heart },
                              { value: "gain_muscle", label: t("food.goalOptions.gainMuscle"), icon: Dumbbell },
                            ].map((option) => {
                              const Icon = option.icon;
                              const isActive = form.watch("goal") === option.value;

                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => form.setValue("goal", option.value as UserFoodPreferences["goal"], { shouldValidate: true, shouldDirty: true })}
                                  className={`flex items-center gap-3 rounded-[18px] border px-4 py-4 text-left transition ${
                                    isActive
                                      ? "border-eatrivo-purple bg-eatrivo-purple/5"
                                      : "border-eatrivo-black-primary/10 bg-white"
                                  }`}
                                >
                                  <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-white ${isActive ? "text-eatrivo-purple" : "text-eatrivo-black-secondary"}`}>
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <span className="text-sm font-medium text-eatrivo-black-primary">{option.label}</span>
                                </button>
                              );
                            })}
                          </div>
                          {renderFieldError("goal")}
                        </div>
                      </div>
                    )}

                    {currentStep === 5 && (
                      <div className="space-y-4">
                        <div className="rounded-[16px] border border-eatrivo-black-primary/8 bg-eatrivo-white-primary p-4 text-sm leading-6 text-eatrivo-black-secondary">
                          {t("wizard.diet.helper")}
                        </div>
                        <div>
                          <label className={fieldLabelClass}>
                            {t("food.diet")}
                          </label>
                          <Select
                            value={form.watch("diet_preferences")}
                            onValueChange={(value) =>
                              form.setValue("diet_preferences", value as UserFoodPreferences["diet_preferences"], {
                                shouldValidate: true,
                                shouldDirty: true,
                              })
                            }
                          >
                            <SelectTrigger className="h-14 rounded-[16px] border-eatrivo-black-primary/10 bg-white px-4 text-base text-eatrivo-black-primary shadow-none focus:border-eatrivo-purple focus:ring-eatrivo-purple/20">
                              <SelectValue placeholder={t("food.dietPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{t("food.dietOptions.none")}</SelectItem>
                              <SelectItem value="lactosefree">{t("food.dietOptions.lactoseFree")}</SelectItem>
                              <SelectItem value="vegetarian">{t("food.dietOptions.vegetarian")}</SelectItem>
                              <SelectItem value="vegan">{t("food.dietOptions.vegan")}</SelectItem>
                              <SelectItem value="pescatarian">{t("food.dietOptions.pescatarian")}</SelectItem>
                              <SelectItem value="ketogenic">{t("food.dietOptions.ketogenic")}</SelectItem>
                              <SelectItem value="paleolithic">{t("food.dietOptions.paleo")}</SelectItem>
                            </SelectContent>
                          </Select>
                          {renderFieldError("diet_preferences")}
                        </div>
                      </div>
                    )}

                    {currentStep === 6 && (
                      <div className="space-y-5">
                        <div className="rounded-[20px] border border-eatrivo-black-primary/8 bg-eatrivo-white-primary p-4">
                          <div className="mb-4 flex items-start gap-3">
                            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-eatrivo-green/10 text-eatrivo-green">
                              <ShieldCheck className="h-5 w-5" />
                            </div>
                            <p className="max-w-[14rem] text-xl font-black leading-7 tracking-[-0.02em] text-eatrivo-black-primary">
                              {t("wizard.finish.allergyQuestion")}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {ALLERGY_SUGGESTIONS.map((allergyKey) => {
                              const label = t(`wizard.finish.allergyOptions.${allergyKey}`);
                              const isActive = selectedAllergies.includes(label.toLowerCase());

                              return (
                                <button
                                  key={allergyKey}
                                  type="button"
                                  onClick={() => toggleAllergy(label)}
                                  className={`inline-flex items-center gap-2 rounded-[16px] border px-4 py-3 text-sm font-medium transition ${
                                    isActive
                                      ? "border-eatrivo-purple bg-eatrivo-purple/5 text-eatrivo-black-primary"
                                      : "border-eatrivo-black-primary/8 bg-white text-eatrivo-black-primary"
                                  }`}
                                >
                                  <span className={`h-2.5 w-2.5 rounded-full ${isActive ? "bg-eatrivo-purple" : "bg-eatrivo-black-secondary/20"}`} />
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <label className={fieldLabelClass}>
                            {t("food.likes")}
                          </label>
                          <Textarea
                            {...form.register("likes")}
                            placeholder={t("food.likesPlaceholder")}
                            className={textareaSurfaceClass}
                          />
                          {renderFieldError("likes")}
                        </div>

                        <div>
                          <label className={fieldLabelClass}>
                            {t("food.dislikes")}
                          </label>
                          <Textarea
                            {...form.register("dislikes")}
                            placeholder={t("food.dislikesPlaceholder")}
                            className={textareaSurfaceClass}
                          />
                          {renderFieldError("dislikes")}
                        </div>

                        <div>
                          <label className={fieldLabelClass}>
                            {t("food.allergies")}
                          </label>
                          <Textarea
                            {...form.register("allergies")}
                            placeholder={t("food.allergiesPlaceholder")}
                            className={textareaSurfaceClass}
                          />
                          {renderFieldError("allergies")}
                        </div>

                        <div className="rounded-[20px] border border-eatrivo-black-primary/10 bg-eatrivo-white-primary p-4">
                          <div className="mb-4 flex items-center gap-2 text-eatrivo-black-primary">
                            <ShieldCheck className="h-5 w-5 text-eatrivo-green" />
                            <h2 className="text-base font-semibold">{t("consents.title")}</h2>
                          </div>
                          <div className="space-y-3">
                            <label className="flex gap-3 rounded-[16px] border border-eatrivo-black-primary/10 bg-white px-4 py-3 text-sm leading-6 text-eatrivo-black-secondary">
                              <input
                                type="checkbox"
                                checked={consents.termsAndPrivacy}
                                onChange={(event) => {
                                  setConsents((previous) => ({
                                    ...previous,
                                    termsAndPrivacy: event.target.checked,
                                  }));
                                  if (event.target.checked) {
                                    setShowConsentError(false);
                                  }
                                }}
                                className="mt-1 h-4 w-4 rounded border-eatrivo-black-primary/20 accent-eatrivo-purple"
                              />
                              <span>
                                {t("consents.termsAndPrivacy.label")} {" "}
                                <a href={`/${locale}/terms-of-service`} target="_blank" rel="noreferrer" className="font-semibold text-eatrivo-purple underline underline-offset-4">
                                  {t("consents.termsAndPrivacy.termsLink")}
                                </a>{" "}
                                {t("consents.termsAndPrivacy.and")} {" "}
                                <a href={`/${locale}/privacy-policy`} target="_blank" rel="noreferrer" className="font-semibold text-eatrivo-purple underline underline-offset-4">
                                  {t("consents.termsAndPrivacy.privacyLink")}
                                </a>
                              </span>
                            </label>

                            <label className="flex gap-3 rounded-[16px] border border-eatrivo-black-primary/10 bg-white px-4 py-3 text-sm leading-6 text-eatrivo-black-secondary">
                              <input
                                type="checkbox"
                                checked={consents.medicalDisclaimer}
                                onChange={(event) => {
                                  setConsents((previous) => ({
                                    ...previous,
                                    medicalDisclaimer: event.target.checked,
                                  }));
                                  if (event.target.checked) {
                                    setShowConsentError(false);
                                  }
                                }}
                                className="mt-1 h-4 w-4 rounded border-eatrivo-black-primary/20 accent-eatrivo-purple"
                              />
                              <span>
                                {t("consents.medicalDisclaimer.label")} {" "}
                                <a href={`/${locale}/medical-disclaimer`} target="_blank" rel="noreferrer" className="font-semibold text-eatrivo-purple underline underline-offset-4">
                                  {t("consents.medicalDisclaimer.link")}
                                </a>
                              </span>
                            </label>

                            <label className="flex gap-3 rounded-[16px] border border-eatrivo-black-primary/10 bg-white px-4 py-3 text-sm leading-6 text-eatrivo-black-secondary">
                              <input
                                type="checkbox"
                                checked={consents.healthDataProcessing}
                                onChange={(event) => {
                                  setConsents((previous) => ({
                                    ...previous,
                                    healthDataProcessing: event.target.checked,
                                  }));
                                  if (event.target.checked) {
                                    setShowConsentError(false);
                                  }
                                }}
                                className="mt-1 h-4 w-4 rounded border-eatrivo-black-primary/20 accent-eatrivo-purple"
                              />
                              <span>{t("consents.healthData.label")}</span>
                            </label>

                            {showConsentError && (
                              <p className="text-sm text-eatrivo-red">{t("consents.mustAgree")}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                <div className="mt-10 flex items-center gap-3">
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handlePrevious}
                      className="h-14 flex-1 rounded-[18px] border border-eatrivo-black-primary/10 bg-white text-eatrivo-purple shadow-none hover:bg-eatrivo-purple/5"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      {t("wizard.back")}
                    </Button>
                  )}

                  {currentStep < TOTAL_STEPS ? (
                    <Button
                      type="button"
                      onClick={handleContinue}
                      className="h-14 flex-1 rounded-[18px] bg-eatrivo-purple text-base font-semibold text-white shadow-none hover:bg-eatrivo-purple/90"
                    >
                      {t("wizard.next")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="h-14 flex-1 rounded-[18px] bg-eatrivo-purple text-base font-semibold text-white shadow-none hover:bg-eatrivo-purple/90 disabled:opacity-70"
                    >
                      {isLoading ? t("wizard.finishing") : t("wizard.finishCta")}
                      {!isLoading && <Check className="ml-2 h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </motion.section>
        </main>
      </div>
    </div>
  );
}
