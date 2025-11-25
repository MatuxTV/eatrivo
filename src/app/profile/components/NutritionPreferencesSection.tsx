"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Save, Scale, Activity, UtensilsCrossed, Clock, DollarSign, Heart, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const nutritionSchema = z.object({
  sex: z.enum(["man", "woman"]),
  height: z.number().min(100, "Výška musí byť aspoň 100 cm").max(250, "Výška musí byť max 250 cm"),
  weight: z.string().min(2, "Zadajte hmotnosť"),
  activity_level: z.string().min(1, "Vyberte úroveň aktivity"),
  goal: z.string().min(1, "Vyberte cieľ"),
  meal_per_day: z.number().min(1).max(6),
  cooking_time_pref: z.string().min(1, "Vyberte preferovaný čas"),
  diet_preferences: z.string().min(1, "Vyberte typ stravovania"),
  budget_preference: z.string().min(1, "Vyberte rozpočet"),
  likes: z.string().optional(),
  dislikes: z.string().optional(),
  allergies: z.string().optional(),
});

type NutritionFormData = z.infer<typeof nutritionSchema>;

interface UserNutritionData {
  sex: "man" | "woman";
  height: number;
  weight: string | number;
  activity_level: string;
  goal: string;
  meal_per_day: number | null;
  cooking_time_pref: string | null;
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
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<NutritionFormData>({
    resolver: zodResolver(nutritionSchema),
    defaultValues: {
      sex: "man",
      height: 170,
      weight: "",
      activity_level: "sedentary",
      goal: "maintain_weight",
      meal_per_day: 3,
      cooking_time_pref: "normal",
      diet_preferences: "none",
      budget_preference: "medium",
      likes: "",
      dislikes: "",
      allergies: "",
    },
  });

  useEffect(() => {
    if (nutritionData) {
      // Ensure all values are properly formatted for the form
      const formData = {
        sex: nutritionData.sex,
        height: nutritionData.height,
        weight: String(nutritionData.weight),
        activity_level: nutritionData.activity_level?.trim() || "sedentary",
        goal: nutritionData.goal?.trim() || "maintain_weight",
        meal_per_day: nutritionData.meal_per_day || 3,
        cooking_time_pref: nutritionData.cooking_time_pref?.trim() || "normal",
        diet_preferences: nutritionData.diet_preferences?.trim() || "none",
        budget_preference: nutritionData.budget_preference?.trim() || "medium",
        likes: nutritionData.likes || "",
        dislikes: nutritionData.dislikes || "",
        allergies: nutritionData.allergies || "",
      };
      reset(formData);
    }
  }, [nutritionData, reset]);

  const onSubmit = async (data: NutritionFormData) => {
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
      reset(data);
      toast.success("Nutričné preferencie boli úspešne aktualizované");
    } catch (error) {
      console.error("Error updating nutrition:", error);
      toast.error("Nepodarilo sa aktualizovať preferencie");
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

  const sex = watch("sex");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-8 bg-eatrivo-light">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Nutričné preferencie
            </h2>
            <p className="text-sm text-gray-500">
              Nastavte svoje stravovacie potreby a preferencie
            </p>
          </div>

          {/* Physical Parameters */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Scale className="w-5 h-5 text-eatrivo-purple" />
              Fyzické parametre
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sex */}
              <div className="space-y-2">
                <Label htmlFor="sex">Pohlavie</Label>
                <Select
                  value={sex}
                  onValueChange={(value) => setValue("sex", value as "man" | "woman", { shouldDirty: true })}
                >
                  <SelectTrigger className={errors.sex ? "border-red-500" : ""}>
                    <SelectValue placeholder="Vyberte pohlavie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="man">Muž</SelectItem>
                    <SelectItem value="woman">Žena</SelectItem>
                  </SelectContent>
                </Select>
                {errors.sex && <p className="text-sm text-red-500">{errors.sex.message}</p>}
              </div>

              {/* Height */}
              <div className="space-y-2">
                <Label htmlFor="height">Výška (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  {...register("height")}
                  placeholder="175"
                  className={errors.height ? "border-red-500" : ""}
                />
                {errors.height && <p className="text-sm text-red-500">{errors.height.message}</p>}
              </div>

              {/* Weight */}
              <div className="space-y-2">
                <Label htmlFor="weight">Hmotnosť (kg)</Label>
                <Input
                  id="weight"
                  {...register("weight")}
                  placeholder="70"
                  className={errors.weight ? "border-red-500" : ""}
                />
                {errors.weight && <p className="text-sm text-red-500">{errors.weight.message}</p>}
              </div>

              {/* Meals per day */}
              <div className="space-y-2">
                <Label htmlFor="meal_per_day">Počet jedál denne</Label>
                <Input
                  id="meal_per_day"
                  type="number"
                  {...register("meal_per_day")}
                  min={1}
                  max={6}
                  className={errors.meal_per_day ? "border-red-500" : ""}
                />
                {errors.meal_per_day && <p className="text-sm text-red-500">{errors.meal_per_day.message}</p>}
              </div>
            </div>
          </div>

          {/* Activity & Goals */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-eatrivo-purple" />
              Aktivita a ciele
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Activity Level */}
              <div className="space-y-2">
                <Label htmlFor="activity_level">Úroveň aktivity</Label>
                <Select
                  key={`activity-${watch("activity_level")}`}
                  value={watch("activity_level")}
                  onValueChange={(value) => setValue("activity_level", value, { shouldDirty: true })}
                >
                  <SelectTrigger className={errors.activity_level ? "border-red-500" : ""}>
                    <SelectValue placeholder="Vyberte aktivitu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">Sedavý životný štýl</SelectItem>
                    <SelectItem value="lightly_active">Mierne aktívny</SelectItem>
                    <SelectItem value="moderately_active">Stredne aktívny</SelectItem>
                    <SelectItem value="very_active">Veľmi aktívny</SelectItem>
                    <SelectItem value="athlete">Extrémne aktívny (atléti)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.activity_level && <p className="text-sm text-red-500">{errors.activity_level.message}</p>}
              </div>

              {/* Goal */}
              <div className="space-y-2">
                <Label htmlFor="goal">Váš cieľ</Label>
                <Select
                  key={`goal-${watch("goal")}`}
                  value={watch("goal")}
                  onValueChange={(value) => setValue("goal", value, { shouldDirty: true })}
                >
                  <SelectTrigger className={errors.goal ? "border-red-500" : ""}>
                    <SelectValue placeholder="Vyberte cieľ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lose_weight">Schudnúť</SelectItem>
                    <SelectItem value="maintain_weight">Udržať hmotnosť</SelectItem>
                    <SelectItem value="gain_muscle">Nabrať svaly</SelectItem>
                  </SelectContent>
                </Select>
                {errors.goal && <p className="text-sm text-red-500">{errors.goal.message}</p>}
              </div>
            </div>
          </div>

          {/* Dietary Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-eatrivo-purple" />
              Stravovacie preferencie
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Diet Preferences */}
              <div className="space-y-2">
                <Label htmlFor="diet_preferences">Typ stravovania</Label>
                <Select
                  key={`diet-${watch("diet_preferences")}`}
                  value={watch("diet_preferences")}
                  onValueChange={(value) => setValue("diet_preferences", value, { shouldDirty: true })}
                >
                  <SelectTrigger className={errors.diet_preferences ? "border-red-500" : ""}>
                    <SelectValue placeholder="Vyberte typ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Všetko</SelectItem>
                    <SelectItem value="lactosefree">Bez laktózy</SelectItem>
                    <SelectItem value="vegetarian">Vegetarián</SelectItem>
                    <SelectItem value="vegan">Vegán</SelectItem>
                    <SelectItem value="pescatarian">Pesketarián</SelectItem>
                    <SelectItem value="ketogenic">Ketogénna diéta</SelectItem>
                    <SelectItem value="paleolithic">Paleo</SelectItem>
                  </SelectContent>
                </Select>
                {errors.diet_preferences && <p className="text-sm text-red-500">{errors.diet_preferences.message}</p>}
              </div>

              {/* Cooking Time */}
              <div className="space-y-2">
                <Label htmlFor="cooking_time_pref" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Čas na prípravu
                </Label>
                <Select
                  key={`time-${watch("cooking_time_pref")}`}
                  value={watch("cooking_time_pref")}
                  onValueChange={(value) => setValue("cooking_time_pref", value, { shouldDirty: true })}
                >
                  <SelectTrigger className={errors.cooking_time_pref ? "border-red-500" : ""}>
                    <SelectValue placeholder="Vyberte čas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quick">Rýchle (do 15 min)</SelectItem>
                    <SelectItem value="normal">Stredné (15-30 min)</SelectItem>
                    <SelectItem value="slow">Dlhšie (30+ min)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.cooking_time_pref && <p className="text-sm text-red-500">{errors.cooking_time_pref.message}</p>}
              </div>

              {/* Budget */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="budget_preference" className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Rozpočet
                </Label>
                <Select
                  key={`budget-${watch("budget_preference")}`}
                  value={watch("budget_preference")}
                  onValueChange={(value) => setValue("budget_preference", value, { shouldDirty: true })}
                >
                  <SelectTrigger className={errors.budget_preference ? "border-red-500" : ""}>
                    <SelectValue placeholder="Vyberte rozpočet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Nízky (šetrné jedlá)</SelectItem>
                    <SelectItem value="medium">Stredný (vyvážené)</SelectItem>
                    <SelectItem value="high">Vysoký (prémiové suroviny)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.budget_preference && <p className="text-sm text-red-500">{errors.budget_preference.message}</p>}
              </div>
            </div>
          </div>

          {/* Food Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Heart className="w-5 h-5 text-eatrivo-purple" />
              Chute a obmedzenia
            </h3>
            <div className="space-y-4">
              {/* Likes */}
              <div className="space-y-2">
                <Label htmlFor="likes">Obľúbené jedlá (oddelené čiarkou)</Label>
                <Textarea
                  id="likes"
                  {...register("likes")}
                  placeholder="napr. kurča, brokolica, ryža, paradajky..."
                  rows={3}
                />
              </div>

              {/* Dislikes */}
              <div className="space-y-2">
                <Label htmlFor="dislikes">Neobľúbené jedlá (oddelené čiarkou)</Label>
                <Textarea
                  id="dislikes"
                  {...register("dislikes")}
                  placeholder="napr. ryby, kapusta, huby..."
                  rows={3}
                />
              </div>

              {/* Allergies */}
              <div className="space-y-2">
                <Label htmlFor="allergies" className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  Alergie a intolerancie
                </Label>
                <Textarea
                  id="allergies"
                  {...register("allergies")}
                  placeholder="napr. laktóza, orechy, glutén..."
                  rows={3}
                  className="border-red-200 focus:border-red-400"
                />
                <p className="text-xs text-gray-500">
                  Tieto položky budú vylúčené zo všetkých vašich jedálnych plánov
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={!isDirty || isSaving}
            className="w-full bg-gradient-to-r from-eatrivo-purple to-eatrivo-pink hover:opacity-90 transition-opacity"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Ukladám...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Uložiť zmeny
              </>
            )}
          </Button>
        </form>
      </Card>
    </motion.div>
  );
}
