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
} from "lucide-react";

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
            Jedálne preferencie
          </CardTitle>
          <CardDescription className="text-base text-gray-500 max-w-md mx-auto">
            Pomôžte nám vytvoriť pre vás personalizované jedálne odporúčania.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Basic Info Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">
                  Základné údaje
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="sex"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClasses}>
                          Pohlavie *
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className={selectTriggerClasses}>
                              <SelectValue placeholder="Vyberte pohlavie" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="man">Muž</SelectItem>
                            <SelectItem value="woman">Žena</SelectItem>
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
                  Telesné parametre
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClasses}>
                          <Ruler className="w-4 h-4 text-eatrivo-purple" />
                          Výška (cm) *
                        </FormLabel>
                        <FormControl>
                          <Input
                            className={inputClasses}
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
                        <FormLabel className={labelClasses}>
                          <Scale className="w-4 h-4 text-eatrivo-purple" />
                          Hmotnosť (kg) *
                        </FormLabel>
                        <FormControl>
                          <Input
                            className={inputClasses}
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
              </div>

              {/* Lifestyle Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 pb-2">
                  Životný štýl
                </h3>
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="activity_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClasses}>
                          <Activity className="w-4 h-4 text-eatrivo-orange" />
                          Úroveň aktivity *
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className={selectTriggerClasses}>
                              <SelectValue placeholder="Vyberte úroveň aktivity" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="sedentary">
                              Sedavý (kancelárska práca)
                            </SelectItem>
                            <SelectItem value="lightly_active">
                              Mierne aktívny (1-2x týždenne)
                            </SelectItem>
                            <SelectItem value="moderately_active">
                              Stredne aktívny (3-5x týždenne)
                            </SelectItem>
                            <SelectItem value="very_active">
                              Veľmi aktívny (6-7x týždenne)
                            </SelectItem>
                            <SelectItem value="athlete">
                              Športovec (Viac krát denne)
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
                          Cieľ *
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className={selectTriggerClasses}>
                              <SelectValue placeholder="Vyberte cieľ" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="lose_weight">
                              Schudnúť
                            </SelectItem>
                            <SelectItem value="maintain_weight">
                              Udržať váhu
                            </SelectItem>
                            <SelectItem value="gain_muscle">
                              Získať svalovú hmotu
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
                  Preferencie jedla
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="meal_per_day"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClasses}>
                          <Utensils className="w-4 h-4 text-eatrivo-blue" />
                          Jedál denne
                        </FormLabel>
                        <FormControl>
                          <Input
                            className={inputClasses}
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
                        <FormLabel className={labelClasses}>
                          <Clock className="w-4 h-4 text-eatrivo-blue" />
                          Čas na varenie
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className={selectTriggerClasses}>
                              <SelectValue placeholder="Vyberte preferenciu" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="quick">
                              Rýchlo (do 15 min)
                            </SelectItem>
                            <SelectItem value="normal">
                              Normálne (15-45 min)
                            </SelectItem>
                            <SelectItem value="slow">
                              Pomaly (45+ min)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="diet_preferences"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClasses}>
                          Stravovanie
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className={selectTriggerClasses}>
                              <SelectValue placeholder="Vyberte typ stravovania" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">
                              Žiadne obmedzenie
                            </SelectItem>
                            <SelectItem value="lactosefree">
                              Bez laktózy
                            </SelectItem>
                            <SelectItem value="vegetarian">
                              Vegetariánske
                            </SelectItem>
                            <SelectItem value="vegan">Vegánske</SelectItem>
                            <SelectItem value="pescatarian">
                              Pescatariánske
                            </SelectItem>
                            <SelectItem value="ketogenic">Ketogénne</SelectItem>
                            <SelectItem value="paleolithic">Paleo</SelectItem>
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
                          Rozpočet
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className={selectTriggerClasses}>
                              <SelectValue placeholder="Vyberte rozpočet" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Nízky</SelectItem>
                            <SelectItem value="medium">Stredný</SelectItem>
                            <SelectItem value="high">Vysoký</SelectItem>
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
                  Detaily
                </h3>
                <FormField
                  control={form.control}
                  name="likes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClasses}>
                        <Heart className="w-4 h-4 text-eatrivo-pink" />
                        Obľúbené jedlá
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className={textareaClasses}
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
                      <FormLabel className={labelClasses}>
                        Neobľúbené jedlá
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className={textareaClasses}
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
                      <FormLabel className={labelClasses}>
                        <AlertCircle className="w-4 h-4 text-eatrivo-red" />
                        Alergie a intolerancie
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          className={textareaClasses}
                          placeholder="Napíšte vaše alergie alebo intolerancie..."
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
                  <ArrowLeft className="w-4 h-4 mr-2" /> Späť
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full sm:w-auto h-12 px-8 bg-eatrivo-green hover:bg-eatrivo-green/90 text-white font-semibold rounded-xl shadow-lg shadow-eatrivo-green/20 hover:shadow-eatrivo-green/40 transition-all duration-300"
                >
                  {isLoading ? "Dokončuje sa..." : "Dokončiť nastavenie"}
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
