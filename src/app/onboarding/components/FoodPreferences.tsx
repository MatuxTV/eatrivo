"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { userFoodPreferencesSchema, type UserFoodPreferences } from "@/lib/schemas/user"

interface FoodPreferencesProps {
  onComplete: (data: UserFoodPreferences) => void
  onPrevious: () => void
  isLoading: boolean
}

export default function FoodPreferences({ onComplete, onPrevious, isLoading }: FoodPreferencesProps) {
  const form = useForm<UserFoodPreferences>({
    resolver: zodResolver(userFoodPreferencesSchema),
    defaultValues: {
      sex: undefined,
      age: 25,
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
  })

  const onSubmit = async (data: UserFoodPreferences) => {
    onComplete(data)
  }

  return (
    <Card className=" text-black">
      <CardHeader>
        <CardTitle>Jedálne preferencie</CardTitle>
        <CardDescription>
          Pomôžte nám vytvoriť pre vás personalizované jedálne odporúčania.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sex"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pohlavie *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
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

              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vek *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="25" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Physical Info */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Výška (cm) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="170" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
                    <FormLabel>Hmotnosť (kg) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1"
                        placeholder="70" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
                  <FormLabel>Úroveň aktivity *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte úroveň aktivity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sedentary">Sedavý (kancelárska práca)</SelectItem>
                      <SelectItem value="lightly_active">Mierne aktívny (1-2x týždenne)</SelectItem>
                      <SelectItem value="moderately_active">Stredne aktívny (3-5x týždenne)</SelectItem>
                      <SelectItem value="very_active">Veľmi aktívny (6-7x týždenne)</SelectItem>
                      <SelectItem value="athlete">Športovec (Viac krát denne)</SelectItem>
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
                  <FormLabel>Cieľ *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte cieľ" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="lose_weight">Schudnúť</SelectItem>
                      <SelectItem value="maintain_weight">Udržať váhu</SelectItem>
                      <SelectItem value="gain_muscle">Získať svalovú hmotu</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Meal Preferences */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="meal_per_day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jedál denne</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="3" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 3)}
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
                    <FormLabel>Čas na varenie</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte preferenciu" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="quick">Rýchlo (do 15 min)</SelectItem>
                        <SelectItem value="normal">Normálne (15-45 min)</SelectItem>
                        <SelectItem value="slow">Pomaly (45+ min)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Diet & Budget */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="diet_preferences"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stravovanie</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte typ stravovania" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Žiadne obmedzenie</SelectItem>
                        <SelectItem value="lactosefree">Bez laktózy</SelectItem>
                        <SelectItem value="vegetarian">Vegetariánske</SelectItem>
                        <SelectItem value="vegan">Vegánske</SelectItem>
                        <SelectItem value="pescatarian">Pescatariánske</SelectItem>
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
                    <FormLabel>Rozpočet</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
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

            {/* Food Preferences */}
            <FormField
              control={form.control}
              name="likes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Obľúbené jedlá</FormLabel>
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
                  <FormLabel>Neobľúbené jedlá</FormLabel>
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
                  <FormLabel>Alergie a intolerancie</FormLabel>
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
            <div className="flex justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onPrevious}
                disabled={isLoading}
              >
                Späť
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
              >
                {isLoading ? "Dokončuje sa..." : "Dokončiť nastavenie"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
