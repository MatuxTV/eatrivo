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
import {
  userFoodPreferencesSchema,
  type UserFoodPreferences,
} from "@/lib/schemas/user";

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


  return (
    <Card className="text-black">
      <CardHeader>
        <CardTitle className="text-xl md:text-2xl">
          Jedálne preferencie
        </CardTitle>
        <CardDescription className="text-sm md:text-base">
          Pomôžte nám vytvoriť pre vás personalizované jedálne odporúčania.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 md:space-y-6"
          >
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <FormField
                control={form.control}
                name="sex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm md:text-base">
                      Pohlavie *
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte pohlavie" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className=" bg-primary-foreground text-primary-text ">
                        <SelectItem
                          className=" hover:bg-primary/10"
                          value="man"
                        >
                          Muž
                        </SelectItem>
                        <SelectItem
                          className=" hover:bg-primary/10"
                          value="woman"
                        >
                          Žena
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Physical Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm md:text-base">
                      Výška (cm) *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="170"
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
                    <FormLabel className="text-sm md:text-base">
                      Hmotnosť (kg) *
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="70"
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

            {/* Activity Level */}
            <FormField
              control={form.control}
              name="activity_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm md:text-base">
                    Úroveň aktivity *
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte úroveň aktivity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-primary-foreground text-primary-text">
                      <SelectItem
                        className="hover:bg-primary/10"
                        value="sedentary"
                      >
                        Sedavý (kancelárska práca)
                      </SelectItem>
                      <SelectItem
                        className="hover:bg-primary/10"
                        value="lightly_active"
                      >
                        Mierne aktívny (1-2x týždenne)
                      </SelectItem>
                      <SelectItem
                        className="hover:bg-primary/10"
                        value="moderately_active"
                      >
                        Stredne aktívny (3-5x týždenne)
                      </SelectItem>
                      <SelectItem
                        className="hover:bg-primary/10"
                        value="very_active"
                      >
                        Veľmi aktívny (6-7x týždenne)
                      </SelectItem>
                      <SelectItem
                        className="hover:bg-primary/10"
                        value="athlete"
                      >
                        Športovec (Viac krát denne)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* {GOAL} */}
            <FormField
              control={form.control}
              name="goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm md:text-base">Cieľ *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte cieľ" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-primary-foreground text-primary-text">
                      <SelectItem
                        className="hover:bg-primary/10"
                        value="lose_weight"
                      >
                        Schudnúť
                      </SelectItem>
                      <SelectItem
                        className="hover:bg-primary/10"
                        value="maintain_weight"
                      >
                        Udržať váhu
                      </SelectItem>
                      <SelectItem
                        className="hover:bg-primary/10"
                        value="gain_muscle"
                      >
                        Získať svalovú hmotu
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Meal Preferences */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <FormField
                control={form.control}
                name="meal_per_day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm md:text-base">
                      Jedál denne
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="3"
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
                    <FormLabel className="text-sm md:text-base">
                      Čas na varenie
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte preferenciu" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-primary-foreground text-primary-text">
                        <SelectItem
                          className="hover:bg-primary/10"
                          value="quick"
                        >
                          Rýchlo (do 15 min)
                        </SelectItem>
                        <SelectItem
                          className="hover:bg-primary/10"
                          value="normal"
                        >
                          Normálne (15-45 min)
                        </SelectItem>
                        <SelectItem
                          className="hover:bg-primary/10"
                          value="slow"
                        >
                          Pomaly (45+ min)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Diet & Budget */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <FormField
                control={form.control}
                name="diet_preferences"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm md:text-base">
                      Stravovanie
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte typ stravovania" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-primary-foreground text-primary-text">
                        <SelectItem
                          className="hover:bg-primary/10"
                          value="none"
                        >
                          Žiadne obmedzenie
                        </SelectItem>
                        <SelectItem
                          className="hover:bg-primary/10"
                          value="lactosefree"
                        >
                          Bez laktózy
                        </SelectItem>
                        <SelectItem
                          className="hover:bg-primary/10"
                          value="vegetarian"
                        >
                          Vegetariánske
                        </SelectItem>
                        <SelectItem
                          className="hover:bg-primary/10"
                          value="vegan"
                        >
                          Vegánske
                        </SelectItem>
                        <SelectItem
                          className="hover:bg-primary/10"
                          value="pescatarian"
                        >
                          Pescatariánske
                        </SelectItem>
                        <SelectItem
                          className="hover:bg-primary/10"
                          value="ketogenic"
                        >
                          Ketogénne
                        </SelectItem>
                        <SelectItem
                          className="hover:bg-primary/10"
                          value="paleolithic"
                        >
                          Paleo
                        </SelectItem>
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
                    <FormLabel className="text-sm md:text-base">
                      Rozpočet
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte rozpočet" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-primary-foreground text-primary-text">
                        <SelectItem className="hover:bg-primary/10" value="low">
                          Nízky
                        </SelectItem>
                        <SelectItem
                          className="hover:bg-primary/10"
                          value="medium"
                        >
                          Stredný
                        </SelectItem>
                        <SelectItem
                          className="hover:bg-primary/10"
                          value="high"
                        >
                          Vysoký
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Food Preferences */}
            <FormField
              control={form.control}
              name="likes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm md:text-base">
                    Obľúbené jedlá
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Napíšte jedlá, ktoré máte radi..."
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
                  <FormLabel className="text-sm md:text-base">
                    Neobľúbené jedlá
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Napíšte jedlá, ktoré nemáte radi..."
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
                  <FormLabel className="text-sm md:text-base">
                    Alergie a intolerancie
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Napíšte vaše alergie alebo intolerancie..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 md:gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={onPrevious}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                Späť
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? "Dokončuje sa..." : "Dokončiť nastavenie"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
