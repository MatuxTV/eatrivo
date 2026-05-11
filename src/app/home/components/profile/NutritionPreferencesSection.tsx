"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Loader2,
  Save,
  Scale,
  Activity,
  Target,
  UtensilsCrossed,
  Heart,
  AlertCircle,
  Ruler,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "@/components/ui/form";
import {
  userProfileNutritionSchema,
  type UserProfileNutrition,
} from "@/lib/schemas/user";
import { useTranslations } from "next-intl";

interface UserNutritionData {
  sex: "man" | "woman";
  height: number;
  weight: string | number;
  activity_level: string | null;
  goal: string | null;
  diet_preferences: string | null;
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

  const form = useForm<UserProfileNutrition>({
    resolver: zodResolver(userProfileNutritionSchema),
    mode: "onBlur",
    defaultValues: nutritionData ? {
      sex: nutritionData.sex,
      height: nutritionData.height,
      weight: Number(nutritionData.weight),
      activity_level: nutritionData.activity_level as UserProfileNutrition["activity_level"],
      goal: nutritionData.goal as UserProfileNutrition["goal"],
      diet_preferences: nutritionData.diet_preferences as UserProfileNutrition["diet_preferences"],
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
        activity_level: nutritionData.activity_level as UserProfileNutrition["activity_level"],
        goal: nutritionData.goal as UserProfileNutrition["goal"],
        diet_preferences: nutritionData.diet_preferences as UserProfileNutrition["diet_preferences"],
        likes: nutritionData.likes || "",
        dislikes: nutritionData.dislikes || "",
        allergies: nutritionData.allergies || "",
      });
    }
  }, [nutritionData, form]);

  const onSubmit = async (data: UserProfileNutrition) => {
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
      <div>
        <Card className="rounded-[1.8rem] border-[#efe2fb] bg-white p-8 shadow-[0_18px_40px_rgba(121,78,171,0.08)]">
          <div className="space-y-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  const inputClasses =
    "h-12 rounded-2xl border-[#e8d9fb] bg-white text-base focus:border-eatrivo-purple focus:ring-eatrivo-purple/20 sm:text-sm";
  const selectTriggerClasses =
    "h-12 rounded-2xl border-[#e8d9fb] bg-white text-base focus:border-eatrivo-purple focus:ring-eatrivo-purple/20 sm:text-sm";
  const textareaClasses =
    "min-h-[110px] resize-none rounded-2xl border-[#e8d9fb] bg-white text-base focus:border-eatrivo-purple focus:ring-eatrivo-purple/20 sm:text-sm";
  const labelClasses =
    "mb-1.5 flex items-center gap-2 text-sm font-semibold text-[#584a6a]";

  return (
    <div>
      <Card className="rounded-[1.8rem] border-[#efe2fb] bg-white p-4 shadow-[0_18px_40px_rgba(121,78,171,0.08)] sm:p-6 lg:p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 sm:space-y-6 lg:space-y-8">
            <div className="space-y-2">
              <h2 className="text-xl font-black tracking-[-0.04em] text-[#35204f] sm:text-2xl">
                {t("nutrition.title")}
              </h2>
              <p className="text-sm font-medium text-[#87739f]">
                {t("nutrition.description")}
              </p>
            </div>

            <div className="space-y-4 rounded-[1.6rem] bg-[linear-gradient(180deg,#fdf8ff_0%,#f7eeff_100%)] p-4 ring-1 ring-[#eedfff] sm:p-5">
              <h3 className="flex items-center gap-2 text-lg font-black tracking-[-0.03em] text-[#35204f]">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-eatrivo-purple ring-1 ring-[#eadcff]">
                  <Scale className="w-5 h-5" />
                </span>
                {t("nutrition.sections.physical")}
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
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

              </div>
            </div>

            <div className="space-y-4 rounded-[1.6rem] bg-white p-4 ring-1 ring-[#efe3fb] sm:p-5">
              <h3 className="flex items-center gap-2 text-lg font-black tracking-[-0.03em] text-[#35204f]">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#faf3ff] text-eatrivo-purple ring-1 ring-[#eadcff]">
                  <Activity className="w-5 h-5" />
                </span>
                {t("nutrition.sections.activityGoals")}
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
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

            <div className="space-y-4 rounded-[1.6rem] bg-white p-4 ring-1 ring-[#efe3fb] sm:p-5">
              <h3 className="flex items-center gap-2 text-lg font-black tracking-[-0.03em] text-[#35204f]">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#faf3ff] text-eatrivo-purple ring-1 ring-[#eadcff]">
                  <UtensilsCrossed className="w-5 h-5" />
                </span>
                {t("nutrition.sections.diet")}
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
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
              </div>
            </div>

            <div className="space-y-4 rounded-[1.6rem] bg-white p-4 ring-1 ring-[#efe3fb] sm:p-5">
              <h3 className="flex items-center gap-2 text-lg font-black tracking-[-0.03em] text-[#35204f]">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#faf3ff] text-eatrivo-purple ring-1 ring-[#eadcff]">
                  <Heart className="w-5 h-5" />
                </span>
                {t("nutrition.sections.preferences")}
              </h3>
              <div className="space-y-4">
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

            <div className="pt-2">
              <Button
                type="submit"
                disabled={!form.formState.isDirty || isSaving}
                className="h-12 w-full rounded-2xl bg-gradient-to-r from-eatrivo-purple to-eatrivo-pink text-base shadow-[0_14px_28px_rgba(125,73,207,0.25)] transition-opacity hover:opacity-90 sm:text-sm"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("nutrition.actions.saving")}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t("nutrition.actions.save")}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}