import type { NextRequest} from "next/server";
import { NextResponse } from "next/server"
import { auth } from "../../../../../auth"
import { db } from "@/index"
import { userProfiles, userInfoTable } from "@/db/schema"
import { completeOnboardingSchema } from "@/lib/schemas/user"
import { checkUserProfileExists } from "@/lib/user-utils"
import { apiLogger } from "@/lib/logger"

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check if user already has a profile
    const existingProfile = await checkUserProfileExists(session.user.id)
    if (existingProfile) {
      return NextResponse.json(
        { error: "Profile already exists" },
        { status: 409 }
      )
    }

    // Parse and validate the request body
    const body = await request.json()
    const validationResult = completeOnboardingSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { profile, foodPreferences } = validationResult.data
    const userId = session.user.id

    // Insert user profile
    const [userProfile] = await db.insert(userProfiles).values({
      userId: userId,
      fullName: profile.fullName,
      // username: profile.username,
      isProfileComplete: true,
    }).returning()

    // Insert user food info
    const [userFoodInfoRecord] = await db.insert(userInfoTable).values({
      userProfileId: userProfile.id,
      sex: foodPreferences.sex,
      dateOfBirth: new Date(profile.dateOfBirth),
      height: foodPreferences.height,
      weight: foodPreferences.weight.toString(),
      activity_level: foodPreferences.activity_level,
      meal_per_day: foodPreferences.meal_per_day || null,
      cooking_time_pref: foodPreferences.cooking_time_pref || null,
      diet_preferences: foodPreferences.diet_preferences || "none",
      budget_preference: foodPreferences.budget_preference || "medium",
      goal: foodPreferences.goal || "maintain_weight",
      likes: foodPreferences.likes || null,
      dislikes: foodPreferences.dislikes || null,
      allergies: foodPreferences.allergies || null,
      // Store complete profile snapshot in JSON format
      profileSnapshot: {
        sex: foodPreferences.sex,
        dateOfBirth: new Date(profile.dateOfBirth),
        height: foodPreferences.height,
        weight: Number(foodPreferences.weight),
        //
        goal: foodPreferences.goal || "maintain_weight",
        activity_level: foodPreferences.activity_level,
        // 
        meal_per_day: foodPreferences.meal_per_day || 3,
        cooking_time_pref: foodPreferences.cooking_time_pref || "normal",
        budget_preference: foodPreferences.budget_preference || "medium",
        
        //
        diet_preferences: foodPreferences.diet_preferences || "none",
        likes: foodPreferences.likes || "",
        dislikes: foodPreferences.dislikes || "",
        allergies: foodPreferences.allergies || "",
      },
    }).returning()

    return NextResponse.json({
      success: true,
      message: "Profile created successfully",
      data: { userProfile, userFoodInfo: userFoodInfoRecord }
    })

  } catch (error) {
    apiLogger.error("Error creating profile", error, {
      metadata: { userId: (await auth())?.user?.id }
    })
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
