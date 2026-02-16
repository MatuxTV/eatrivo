"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  userFoodPreferencesSchema,
  type UserFoodPreferences,
} from "@/lib/schemas/user";
import { motion } from "framer-motion";
import {
  Utensils,
  Activity,
  Target,
  Clock,
  Wallet,
  Heart,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Scale,
  Ruler,
  ChefHat,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface FoodPreferencesProps {
  onComplete: (data: UserFoodPreferences) => void;
  onPrevious: () => void;
  isLoading: boolean;
}

export default function FoodPreferences({
  onComplete,
  onPrevious,
  isLoading,
}: FoodPreferencesProps) {
  const t = useTranslations("onboarding");

  const form = useForm<UserFoodPreferences>({
    resolver: zodResolver(userFoodPreferencesSchema),
    mode: "onBlur",
    defaultValues: {
      sex: undefined,
      height: 170,
      weight: 70,
      activity_level: undefined,
      meal_per_day: 3,
      cooking_time_pref: undefined,
      meal_prep: false,
      meal_prep_days: undefined,
      goal: undefined,
      diet_preferences: "none",
      budget_preference: "medium",
      likes: "",
      dislikes: "",
      allergies: "",
    },
  });

  const onSubmit = async (data: UserFoodPreferences) => {
    onComplete(data);
  };

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
      transition={{ duration: 0.5 }}
    >
      <Card className="border-none shadow-2xl rounded-3xl bg-white overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-eatrivo-green to-eatrivo-purple" />
        <CardHeader className="text-center pb-2 pt-8">
          <div className="w-16 h-16 bg-eatrivo-green/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-eatrivo-green">
            <Utensils className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {t("food.title")}
          </CardTitle>
          <CardDescription className="text-base text-gray-500 max-w-md mx-auto">
            {t("food.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Basic Info Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">
                  {t("food.sections.basic")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="sex"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClasses}>
                          {t("food.sex")} <span aria-hidden="true">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className={selectTriggerClasses}>
                              <SelectValue placeholder={t("food.sexPlaceholder")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="man">{t("food.sexOptions.man")}</SelectItem>
                            <SelectItem value="woman">{t("food.sexOptions.woman")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Physical Info Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">
                  {t("food.sections.physical")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClasses}>
                          <Ruler className="w-4 h-4 text-eatrivo-purple" />
                          {t("food.height")} <span aria-hidden="true">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            className={inputClasses}
                            type="number"
                            placeholder={t("food.heightPlaceholder")}
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClasses}>
                          <Scale className="w-4 h-4 text-eatrivo-purple" />
                          {t("food.weight")} <span aria-hidden="true">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            className={inputClasses}
                            type="number"
                            step="0.1"
                            placeholder={t("food.weightPlaceholder")}
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Lifestyle Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">
                  {t("food.sections.lifestyle")}
                </h3>
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="activity_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClasses}>
                          <Activity className="w-4 h-4 text-eatrivo-orange" />
                          {t("food.activityLevel")} <span aria-hidden="true">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className={selectTriggerClasses}>
                              <SelectValue placeholder={t("food.activityPlaceholder")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="sedentary">
                              {t("food.activityOptions.sedentary")}
                            </SelectItem>
                            <SelectItem value="lightly_active">
                              {t("food.activityOptions.lightlyActive")}
                            </SelectItem>
                            <SelectItem value="moderately_active">
                              {t("food.activityOptions.moderatelyActive")}
                            </SelectItem>
                            <SelectItem value="very_active">
                              {t("food.activityOptions.veryActive")}
                            </SelectItem>
                            <SelectItem value="athlete">
                              {t("food.activityOptions.athlete")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="goal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClasses}>
                          <Target className="w-4 h-4 text-eatrivo-red" />
                          {t("food.goal")} <span aria-hidden="true">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className={selectTriggerClasses}>
                              <SelectValue placeholder={t("food.goalPlaceholder")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="lose_weight">
                              {t("food.goalOptions.loseWeight")}
                            </SelectItem>
                            <SelectItem value="maintain_weight">
                              {t("food.goalOptions.maintainWeight")}
                            </SelectItem>
                            <SelectItem value="gain_muscle">
                              {t("food.goalOptions.gainMuscle")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Preferences Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">
                  {t("food.sections.preferences")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="meal_per_day"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClasses}>
                          <Utensils className="w-4 h-4 text-eatrivo-blue" />
                          {t("food.mealsPerDay")}
                        </FormLabel>
                        <FormControl>
                          <Input
                            className={inputClasses}
                            type="number"
                            placeholder={t("food.mealsPerDayPlaceholder")}
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 3)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cooking_time_pref"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClasses}>
                          <Clock className="w-4 h-4 text-eatrivo-blue" />
                          {t("food.cookingTime")}
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className={selectTriggerClasses}>
                              <SelectValue placeholder={t("food.cookingTimePlaceholder")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="quick">
                              {t("food.cookingTimeOptions.quick")}
                            </SelectItem>
                            <SelectItem value="normal">
                              {t("food.cookingTimeOptions.normal")}
                            </SelectItem>
                            <SelectItem value="slow">
                              {t("food.cookingTimeOptions.slow")}
                            </SelectItem>
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
                      <p className="text-sm font-semibold text-gray-800">{t("food.mealPrepNote.title")}</p>
                      <p className="text-xs text-gray-600 leading-relaxed">{t("food.mealPrepNote.description")}</p>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="meal_prep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClasses}>
                          <ChefHat className="w-4 h-4 text-eatrivo-orange" />
                          {t("food.mealPrep")}
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => field.onChange(value === "true")}
                            value={field.value ? "true" : "false"}
                            className="flex flex-col space-y-2"
                          >
                            <div className="flex items-center space-x-3 p-3 border-2 border-gray-200 rounded-xl hover:border-eatrivo-purple/50 transition-colors cursor-pointer">
                              <RadioGroupItem value="true" id="mealPrep-yes" />
                              <label htmlFor="mealPrep-yes" className="flex-1 cursor-pointer text-sm font-medium text-gray-700">
                                {t("food.mealPrepYes")}
                              </label>
                            </div>
                            <div className="flex items-center space-x-3 p-3 border-2 border-gray-200 rounded-xl hover:border-eatrivo-purple/50 transition-colors cursor-pointer">
                              <RadioGroupItem value="false" id="mealPrep-no" />
                              <label htmlFor="mealPrep-no" className="flex-1 cursor-pointer text-sm font-medium text-gray-700">
                                {t("food.mealPrepNo")}
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
                              {t("food.mealPrepDays")}
                            </FormLabel>
                            <FormControl>
                              <Input
                                className={inputClasses}
                                type="number"
                                min="1"
                                max="7"
                                placeholder={t("food.mealPrepDaysPlaceholder")}
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || undefined)
                                }
                              />
                            </FormControl>
                            <FormDescription className="text-xs text-gray-500">
                              {t("food.mealPrepDaysHelp")}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </motion.div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="diet_preferences"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClasses}>
                          {t("food.diet")}
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className={selectTriggerClasses}>
                              <SelectValue placeholder={t("food.dietPlaceholder")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">
                              {t("food.dietOptions.none")}
                            </SelectItem>
                            <SelectItem value="lactosefree">
                              {t("food.dietOptions.lactoseFree")}
                            </SelectItem>
                            <SelectItem value="vegetarian">
                              {t("food.dietOptions.vegetarian")}
                            </SelectItem>
                            <SelectItem value="vegan">{t("food.dietOptions.vegan")}</SelectItem>
                            <SelectItem value="pescatarian">
                              {t("food.dietOptions.pescatarian")}
                            </SelectItem>
                            <SelectItem value="ketogenic">{t("food.dietOptions.ketogenic")}</SelectItem>
                            <SelectItem value="paleolithic">{t("food.dietOptions.paleo")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="budget_preference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClasses}>
                          <Wallet className="w-4 h-4 text-eatrivo-yellow" />
                          {t("food.budget")}
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className={selectTriggerClasses}>
                              <SelectValue placeholder={t("food.budgetPlaceholder")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">{t("food.budgetOptions.low")}</SelectItem>
                            <SelectItem value="medium">{t("food.budgetOptions.medium")}</SelectItem>
                            <SelectItem value="high">{t("food.budgetOptions.high")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Details Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">
                  {t("food.sections.details")}
                </h3>
                <FormField
                  control={form.control}
                  name="likes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClasses}>
                        <Heart className="w-4 h-4 text-eatrivo-pink" />
                        {t("food.likes")}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className={textareaClasses}
                          placeholder={t("food.likesPlaceholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dislikes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClasses}>
                        {t("food.dislikes")}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className={textareaClasses}
                          placeholder={t("food.dislikesPlaceholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="allergies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClasses}>
                        <AlertCircle className="w-4 h-4 text-eatrivo-red" />
                        {t("food.allergies")}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className={textareaClasses}
                          placeholder={t("food.allergiesPlaceholder")}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4">
                <Button
                  type="button"
                  onClick={onPrevious}
                  disabled={isLoading}
                  className="w-full bg-white sm:w-auto h-12 px-6 border-2 border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> {t("food.back")}
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full sm:w-auto h-12 px-8 bg-eatrivo-green hover:bg-eatrivo-green/90 text-white font-semibold rounded-xl shadow-lg shadow-eatrivo-green/20 hover:shadow-eatrivo-green/40 transition-all duration-300"
                >
                  {isLoading ? t("food.finishing") : t("food.finish")}
                  {!isLoading && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
