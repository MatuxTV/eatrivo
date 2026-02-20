"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Loader2,
  Save,
  Scale,
  Activity,
  Target,
  UtensilsCrossed,
  Clock,
  Wallet,
  Heart,
  AlertCircle,
  Ruler,
  ChefHat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  userFoodPreferencesSchema,
  type UserFoodPreferences,
} from "@/lib/schemas/user";
import { useTranslations } from "next-intl";

interface UserNutritionData {
  sex: "man" | "woman";
  height: number;
  weight: string | number;
  activity_level: string | null;
  goal: string | null;
  meal_per_day: number | null;
  cooking_time_pref: string | null;
  meal_prep: boolean | null;
  meal_prep_days: number | null;
  diet_preferences: string | null;
  budget_preference: string | null;
  likes: string | null;
  dislikes: string | null;
  allergies: string | null;
}

interface NutritionPreferencesSectionProps {
  nutritionData: UserNutritionData | null;
  isLoading: boolean;
  onUpdate: (data: UserNutritionData) => void;
}

export default function NutritionPreferencesSection({
  nutritionData,
  isLoading,
  onUpdate,
}: NutritionPreferencesSectionProps) {
  const t = useTranslations("profile");
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<UserFoodPreferences>({
    resolver: zodResolver(userFoodPreferencesSchema),
    mode: "onBlur",
    defaultValues: nutritionData ? {
      sex: nutritionData.sex,
      height: nutritionData.height,
      weight: Number(nutritionData.weight),
      activity_level: nutritionData.activity_level as UserFoodPreferences["activity_level"],
      goal: nutritionData.goal as UserFoodPreferences["goal"],
      meal_per_day: nutritionData.meal_per_day ?? undefined,
      cooking_time_pref: nutritionData.cooking_time_pref as UserFoodPreferences["cooking_time_pref"],
      meal_prep: nutritionData.meal_prep ?? false,
      meal_prep_days: nutritionData.meal_prep_days ?? undefined,
      diet_preferences: nutritionData.diet_preferences as UserFoodPreferences["diet_preferences"],
      budget_preference: nutritionData.budget_preference as UserFoodPreferences["budget_preference"],
      likes: nutritionData.likes || "",
      dislikes: nutritionData.dislikes || "",
      allergies: nutritionData.allergies || "",
    } : undefined,
  });

  useEffect(() => {
    if (nutritionData && !form.formState.isDirty) {
      form.reset({
        sex: nutritionData.sex,
        height: nutritionData.height,
        weight: Number(nutritionData.weight),
        activity_level: nutritionData.activity_level as UserFoodPreferences["activity_level"],
        goal: nutritionData.goal as UserFoodPreferences["goal"],
        meal_per_day: nutritionData.meal_per_day ?? undefined,
        cooking_time_pref: nutritionData.cooking_time_pref as UserFoodPreferences["cooking_time_pref"],
        meal_prep: nutritionData.meal_prep ?? false,
        meal_prep_days: nutritionData.meal_prep_days ?? undefined,
        diet_preferences: nutritionData.diet_preferences as UserFoodPreferences["diet_preferences"],
        budget_preference: nutritionData.budget_preference as UserFoodPreferences["budget_preference"],
        likes: nutritionData.likes || "",
        dislikes: nutritionData.dislikes || "",
        allergies: nutritionData.allergies || "",
      });
    }
  }, [nutritionData, form]);

  const onSubmit = async (data: UserFoodPreferences) => {
    try {
      setIsSaving(true);
      const response = await fetch("/api/user/nutrition", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to update nutrition data");

      const result = await response.json();
      onUpdate(result.nutrition);
      form.reset(data);
      toast.success(t("nutrition.toast.updated"));
    } catch (error) {
      console.error("Error updating nutrition:", error);
      toast.error(t("nutrition.toast.updateError"));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-8">
          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      </motion.div>
    );
  }

  const inputClasses =
    "bg-white border-gray-200 focus:border-eatrivo-purple focus:ring-eatrivo-purple/20 h-12 rounded-xl";
  const selectTriggerClasses =
    "bg-white border-gray-200 focus:border-eatrivo-purple focus:ring-eatrivo-purple/20 h-12 rounded-xl";
  const textareaClasses =
    "bg-white border-gray-200 focus:border-eatrivo-purple focus:ring-eatrivo-purple/20 min-h-[100px] rounded-xl resize-none";
  const labelClasses =
    "text-sm font-semibold text-gray-700 flex items-center gap-2 mb-1.5";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-8 bg-eatrivo-light">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {t("nutrition.title")}
              </h2>
              <p className="text-sm text-gray-500">
                {t("nutrition.description")}
              </p>
            </div>

            {/* Physical Parameters */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Scale className="w-5 h-5 text-eatrivo-purple" />
                {t("nutrition.sections.physical")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sex */}
                <FormField
                  control={form.control}
                  name="sex"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClasses}>
                        {t("nutrition.fields.sex.label")} <span aria-hidden="true">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className={selectTriggerClasses}>
                            <SelectValue placeholder={t("nutrition.fields.sex.placeholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="man">{t("nutrition.fields.sex.options.man")}</SelectItem>
                          <SelectItem value="woman">{t("nutrition.fields.sex.options.woman")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Height */}
                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClasses}>
                        <Ruler className="w-4 h-4 text-eatrivo-purple" />
                        {t("nutrition.fields.height.label")} <span aria-hidden="true">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          className={inputClasses}
                          type="number"
                          placeholder={t("nutrition.fields.height.placeholder")}
                          value={field.value ?? ""}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const v = e.target.value;
                            field.onChange(v === "" ? ("" as string | number) : parseInt(v) || "");
                          }}
                          onBlur={(e) => {
                            const v = e.target.value;
                            field.onChange(v === "" ? undefined : parseInt(v));
                            field.onBlur();
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Weight */}
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClasses}>
                        <Scale className="w-4 h-4 text-eatrivo-purple" />
                        {t("nutrition.fields.weight.label")} <span aria-hidden="true">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          className={inputClasses}
                          type="number"
                          step="0.1"
                          placeholder={t("nutrition.fields.weight.placeholder")}
                          value={field.value ?? ""}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const v = e.target.value;
                            field.onChange(v === "" ? ("" as string | number) : parseFloat(v) || "");
                          }}
                          onBlur={(e) => {
                            const v = e.target.value;
                            field.onChange(v === "" ? undefined : parseFloat(v));
                            field.onBlur();
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Meals per day */}
                <FormField
                  control={form.control}
                  name="meal_per_day"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClasses}>
                        <UtensilsCrossed className="w-4 h-4 text-eatrivo-blue" />
                        {t("nutrition.fields.mealsPerDay.label")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          className={inputClasses}
                          type="number"
                          min={1}
                          max={10}
                          placeholder="3"
                          value={field.value ?? ""}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const v = e.target.value;
                            field.onChange(v === "" ? ("" as string | number) : parseInt(v) || "");
                          }}
                          onBlur={(e) => {
                            const v = e.target.value;
                            field.onChange(v === "" ? undefined : parseInt(v));
                            field.onBlur();
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Activity & Goals */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Activity className="w-5 h-5 text-eatrivo-purple" />
                {t("nutrition.sections.activityGoals")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Activity Level */}
                <FormField
                  control={form.control}
                  name="activity_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClasses}>
                        <Activity className="w-4 h-4 text-eatrivo-orange" />
                        {t("nutrition.fields.activity.label")} <span aria-hidden="true">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className={selectTriggerClasses}>
                            <SelectValue placeholder={t("nutrition.fields.activity.placeholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sedentary">{t("nutrition.fields.activity.options.sedentary")}</SelectItem>
                          <SelectItem value="lightly_active">{t("nutrition.fields.activity.options.lightly_active")}</SelectItem>
                          <SelectItem value="moderately_active">{t("nutrition.fields.activity.options.moderately_active")}</SelectItem>
                          <SelectItem value="very_active">{t("nutrition.fields.activity.options.very_active")}</SelectItem>
                          <SelectItem value="athlete">{t("nutrition.fields.activity.options.athlete")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Goal */}
                <FormField
                  control={form.control}
                  name="goal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClasses}>
                        <Target className="w-4 h-4 text-eatrivo-red" />
                        {t("nutrition.fields.goal.label")} <span aria-hidden="true">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className={selectTriggerClasses}>
                            <SelectValue placeholder={t("nutrition.fields.goal.placeholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="lose_weight">{t("nutrition.fields.goal.options.lose_weight")}</SelectItem>
                          <SelectItem value="maintain_weight">{t("nutrition.fields.goal.options.maintain_weight")}</SelectItem>
                          <SelectItem value="gain_muscle">{t("nutrition.fields.goal.options.gain_muscle")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Dietary Preferences */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-eatrivo-purple" />
                {t("nutrition.sections.diet")}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Diet Preferences */}
                <FormField
                  control={form.control}
                  name="diet_preferences"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClasses}>
                        {t("nutrition.fields.diet.label")}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className={selectTriggerClasses}>
                            <SelectValue placeholder={t("nutrition.fields.diet.placeholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">{t("nutrition.fields.diet.options.none")}</SelectItem>
                          <SelectItem value="lactosefree">{t("nutrition.fields.diet.options.lactosefree")}</SelectItem>
                          <SelectItem value="vegetarian">{t("nutrition.fields.diet.options.vegetarian")}</SelectItem>
                          <SelectItem value="vegan">{t("nutrition.fields.diet.options.vegan")}</SelectItem>
                          <SelectItem value="pescatarian">{t("nutrition.fields.diet.options.pescatarian")}</SelectItem>
                          <SelectItem value="ketogenic">{t("nutrition.fields.diet.options.ketogenic")}</SelectItem>
                          <SelectItem value="paleolithic">{t("nutrition.fields.diet.options.paleolithic")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Cooking Time */}
                <FormField
                  control={form.control}
                  name="cooking_time_pref"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClasses}>
                        <Clock className="w-4 h-4 text-eatrivo-blue" />
                        {t("nutrition.fields.cookingTime.label")}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className={selectTriggerClasses}>
                            <SelectValue placeholder={t("nutrition.fields.cookingTime.placeholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="quick">{t("nutrition.fields.cookingTime.options.quick")}</SelectItem>
                          <SelectItem value="normal">{t("nutrition.fields.cookingTime.options.normal")}</SelectItem>
                          <SelectItem value="slow">{t("nutrition.fields.cookingTime.options.slow")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Budget */}
                <FormField
                  control={form.control}
                  name="budget_preference"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className={labelClasses}>
                        <Wallet className="w-4 h-4 text-eatrivo-yellow" />
                        {t("nutrition.fields.budget.label")}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className={selectTriggerClasses}>
                            <SelectValue placeholder={t("nutrition.fields.budget.placeholder")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">{t("nutrition.fields.budget.options.low")}</SelectItem>
                          <SelectItem value="medium">{t("nutrition.fields.budget.options.medium")}</SelectItem>
                          <SelectItem value="high">{t("nutrition.fields.budget.options.high")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Meal Prep Section */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                {/* Info Note */}
                <div className="flex gap-3 p-4 bg-eatrivo-green/5 border border-eatrivo-green/20 rounded-xl">
                  <ChefHat className="w-5 h-5 text-eatrivo-green flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-800">{t("nutrition.fields.mealPrep.noteTitle")}</p>
                    <p className="text-xs text-gray-600 leading-relaxed">{t("nutrition.fields.mealPrep.noteDescription")}</p>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="meal_prep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClasses}>
                        <ChefHat className="w-4 h-4 text-eatrivo-orange" />
                        {t("nutrition.fields.mealPrep.label")}
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => field.onChange(value === "true")}
                          value={field.value ? "true" : "false"}
                          className="flex flex-col space-y-2"
                        >
                          <div className="flex items-center space-x-3 p-3 border-2 border-gray-200 rounded-xl hover:border-eatrivo-purple/50 transition-colors cursor-pointer">
                            <RadioGroupItem value="true" id="profile-mealPrep-yes" />
                            <label htmlFor="profile-mealPrep-yes" className="flex-1 cursor-pointer text-sm font-medium text-gray-700">
                              {t("nutrition.fields.mealPrep.yes")}
                            </label>
                          </div>
                          <div className="flex items-center space-x-3 p-3 border-2 border-gray-200 rounded-xl hover:border-eatrivo-purple/50 transition-colors cursor-pointer">
                            <RadioGroupItem value="false" id="profile-mealPrep-no" />
                            <label htmlFor="profile-mealPrep-no" className="flex-1 cursor-pointer text-sm font-medium text-gray-700">
                              {t("nutrition.fields.mealPrep.no")}
                            </label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("meal_prep") && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <FormField
                      control={form.control}
                      name="meal_prep_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelClasses}>
                            {t("nutrition.fields.mealPrep.daysLabel")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              className={inputClasses}
                              type="number"
                              min="1"
                              max="7"
                              placeholder={t("nutrition.fields.mealPrep.daysPlaceholder")}
                              value={field.value ?? ""}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const v = e.target.value;
                                field.onChange(v === "" ? ("" as string | number) : parseInt(v) || "");
                              }}
                              onBlur={(e) => {
                                const v = e.target.value;
                                field.onChange(v === "" ? undefined : parseInt(v));
                                field.onBlur();
                              }}
                            />
                          </FormControl>
                          <FormDescription className="text-xs text-gray-500">
                            {t("nutrition.fields.mealPrep.daysHelp")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}
              </div>
            </div>

            {/* Food Preferences */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Heart className="w-5 h-5 text-eatrivo-purple" />
                {t("nutrition.sections.preferences")}
              </h3>
              <div className="space-y-4">
                {/* Likes */}
                <FormField
                  control={form.control}
                  name="likes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClasses}>
                        <Heart className="w-4 h-4 text-eatrivo-pink" />
                        {t("nutrition.fields.likes.label")}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className={textareaClasses}
                          placeholder={t("nutrition.fields.likes.placeholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Dislikes */}
                <FormField
                  control={form.control}
                  name="dislikes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClasses}>
                        {t("nutrition.fields.dislikes.label")}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className={textareaClasses}
                          placeholder={t("nutrition.fields.dislikes.placeholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Allergies */}
                <FormField
                  control={form.control}
                  name="allergies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={`${labelClasses} text-red-600`}>
                        <AlertCircle className="w-4 h-4" />
                        {t("nutrition.fields.allergies.label")}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className={`${textareaClasses} border-red-200 focus:border-red-400`}
                          placeholder={t("nutrition.fields.allergies.placeholder")}
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-gray-500">
                        {t("nutrition.fields.allergies.helper")}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!form.formState.isDirty || isSaving}
              className="w-full bg-gradient-to-r from-eatrivo-purple to-eatrivo-pink hover:opacity-90 transition-opacity"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("nutrition.actions.saving")}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {t("nutrition.actions.save")}
                </>
              )}
            </Button>
          </form>
        </Form>
      </Card>
    </motion.div>
  );
}
