import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { HumanMessage, SystemMessage } from "@langchain/core/messages"

interface UserProfile {
  age: number
  weight: number
  height: number
  sex: "man" | "woman"
  goal: "weight_loss" | "muscle_gain" | "maintenance"
  activityLevel: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "athlete"
}

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash",
  maxOutputTokens: 2048,
  temperature: 0.7,
  apiKey: process.env.GOOGLE_AI_API_KEY,
})

export class EatrivoAIService {
  static async generateInsightsFromUserData(userProfile: UserProfile, shoppingLists: any[]) {
    try {
      const prompt = `
        Analyzuj údaje slovenského používateľa a vytvor personalizované výživové odporúčania v JSON formáte.
        
        UŽÍVATEĽSKÉ ÚDAJE:
        - Vek: ${userProfile.age} rokov
        - Váha: ${userProfile.weight} kg
        - Výška: ${userProfile.height} cm
        - Pohlavie: ${userProfile.sex}
        - Cieľ: ${userProfile.goal}
        - Aktivita: ${userProfile.activityLevel}
        
        NÁKUPNY ZOZNAM:
        ${JSON.stringify(shoppingLists.slice(0, 3), null, 2)}
        
        Vytvor JSON obsahujúci:
        {
          "personalizedRecommendations": {
            "dailyCalories": number,
            "macroSplit": {
              "protein": number,
              "carbs": number, 
              "fat": number
            },
            "mealTiming": [
              {
                "meal": "raňajky|obed|večera",
                "time": "HH:MM",
                "caloriePercentage": number,
                "recommendations": ["tip1", "tip2"]
              }
            ],
            "weeklyMealIdeas": [
              {
                "day": "Pondelok",
                "breakfast": {"name": "", "calories": 0, "prepTime": ""},
                "lunch": {"name": "", "calories": 0, "prepTime": ""},
                "dinner": {"name": "", "calories": 0, "prepTime": ""}
              }
            ],
            "nutritionTips": ["tip1", "tip2", "tip3"],
            "shoppingOptimization": ["návh1", "návrh2"],
            "goalProgress": {
              "currentFocus": "",
              "nextSteps": ["krok1", "krok2"],
              "estimatedTimeToGoal": ""
            }
          }
        }
        
        DÔLEŽITÉ:
        - Všetko v slovenčine
        - Reálne slovenské jedlá a ingrediencie  
        - Praktické a dosiahnuteľné rady
        - Zohľadni slovenské kulinárske tradície
        - Vráť iba validný JSON, žiadny iný text
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