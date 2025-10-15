import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import shoppingData from '../app/test_json_files/shoppingData.json' // testovacie dáta;

interface UserProfile {
  age: number
  weight: number
  height: number
  sex: "man" | "woman"
  goal: "lose_weight" | "gain_muscle" | "maintain_weight"
  activityLevel: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "athlete"
  mealsPerDay: number // počet jedál za deň
  maxPrepTime: "quick" | "normal" | "slow"
  dietType?: "none" | "lactosefree" | "vegetarian" | "vegan" | "pescatarian" | "ketogenic" | "paleolithic" // typ stravy
  budget: "low" | "medium" | "high" // rozpočet na potraviny
  likedFoods: string // čo má rád
  dislikedFoods: string // čo nemá rád
  allergies: string // alergie a intolerancie
}


const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  maxOutputTokens: 2048,
  temperature: 0.7,
  apiKey: process.env.GOOGLE_AI_API_KEY,
})

export class EatrivoAIService {

  static async generateWeeklyMealPlan(userProfile: UserProfile) {
    try {
      const prompt = `
        Vytvor kompletný jedálniček na celý týždeň PRESNE NA ZÁKLADE DOSTUPNÉHO NÁKUPNÉHO ZOZNAMU.
        
        PROFIL POUŽÍVATEĽA:
        - Vek: ${userProfile.age} rokov, váha: ${userProfile.weight} kg, výška: ${userProfile.height} cm
        - Pohlavie: ${userProfile.sex === 'man' ? 'muž' : 'žena'}
        - Cieľ: ${userProfile.goal}
        - Aktivita: ${userProfile.activityLevel}
        - Počet jedál za deň: ${userProfile.mealsPerDay}
        - Rychlost prípravy jedla: ${userProfile.maxPrepTime} 
        - Alergie: ${userProfile.allergies || 'žiadne'}
        - Nemá rád: ${userProfile.dislikedFoods || 'žiadne'}
        
        DOSTUPNÝ NÁKUPNÝ ZOZNAM (MUSÍŠ POUŽIŤ VŠETKO):
        ${JSON.stringify(shoppingData, null, 2)}
        
        KRITICKÉ POŽIADAVKY - MUSÍŠ DODRŽAŤ:
        1. POUŽIŤ VŠETKY POTRAVINY zo shopping listu v PRESNÝCH množstvách
        2. NEVYMÝŠĽAJ žiadne nové ingrediencie - len tie zo zoznamu
        3. ROZDEĽ potraviny medzi ${userProfile.mealsPerDay} jedál denne na 7 dní
        4. KAŽDÁ potravina musí byť použitá úplne (celé množstvo)
        5. Prípava receptov musí byť ${userProfile.maxPrepTime} 
        
        VYTVOR JEDÁLNIČEK V JSON FORMÁTE:
        {
          "weeklyMealPlan": {
            "shoppingListUsage": {
              "totalItemsAvailable": 0,
              "totalItemsUsed": 0,
              "usagePercentage": "100%",
              "unusedItems": []
            },
            "week": [
              {
                "day": "Pondelok",
                "meals": [
                  {
                    "mealType": "raňajky",
                    "time": "07:00",
                    "name": "Názov jedla presne zo shopping listu",
                    "prepTime": 0,
                    "difficulty": "ľahké",
                    "usedFromShoppingList": [
                      {
                        "item": "presný názov zo shopping listu",
                        "availableAmount": "množstvo zo shopping listu",
                        "usedAmount": "koľko použijem v tomto jedle",
                        "remainingAmount": "koľko zostane"
                      }
                    ],
                    "instructions": [
                      "detailný krok 1 s presnými množstvami",
                      "detailný krok 2",
                      "krok 3 - finalizácia"
                    ],
                    "estimatedCalories": 0,
                    "macros": {
                      "protein": 0,
                      "carbs": 0,
                      "fat": 0
                    }
                  }
                ]
              }
            ],
            "ingredientTracking": [
              {
                "originalItem": "presný názov zo shopping listu",
                "originalAmount": "celkové množstvo zo shopping listu", 
                "usedIn": [
                  {
                    "day": "Pondelok",
                    "meal": "raňajky",
                    "amount": "použité množstvo"
                  }
                ],
                "totalUsed": "celkové použité množstvo",
                "remaining": "zostávajúce množstvo (musí byť 0)",
                "fullyUtilized": true
              }
            ],
            "weeklyNotes": [
              "Všetky potraviny zo shopping listu boli úplne využité",
              "Recepty vytvorené presne podľa dostupných ingrediencií"
            ]
          }
        }
        
        ABSOLÚTNE PRAVIDLÁ (100% DODRŽANIE):
        1. POUŽIŤ každú potravinu zo shopping listu v PRESNOM množstve
        2. NESMIEŠ pridať žiadne ingrediencie ktoré nie sú v zozname
        3. KAŽDÁ potravina musí mať "remaining: 0" - úplne spotrebovaná
        4. Rozdeliť potraviny medzi ${userProfile.mealsPerDay} jedál × 7 dní = ${userProfile.mealsPerDay * 7} jedál celkom
        5. Recepty maximálne ${userProfile.maxPrepTime} minút
        6. Rešpektuj alergie: ${userProfile.allergies || 'žiadne'}
        
        KONTROLA VYUŽITIA:
        - ingredientTracking: každá položka musí mať "fullyUtilized": true
        - unusedItems: musí byť prázdne pole []
        - usagePercentage: musí byť presne "100%"
        
        VÝSTUP:
        - Iba čistý JSON bez markdown
        - Slovenské názvy jedál
        - Detailné kroky prípravy
        - Sledovanie využitia každej ingrediencie
        
        DÔLEŽITÉ: Ak shopping list obsahuje napr. "500g kuracích pŕs", MUSÍŠ použiť celých 500g rozdelených medzi jedlá tak aby remaining = 0g.
      `

      const response = await model.invoke([new HumanMessage(prompt)])
      const jsonContent = this.extractJSON(response.content as string)
      
      return jsonContent
    } catch (error) {
      console.error('Error generating AI insights:', error)
      throw new Error('Failed to generate AI insights')
    }
  }


  private static extractJSON(content: string): any {
    try {
      // Try to find JSON in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      
      // If no JSON found, try to parse the whole content
      return JSON.parse(content)
    } catch (error) {
      console.error('Failed to extract JSON from AI response:', error)
      throw new Error('Invalid JSON response from AI')
    }
  }
}