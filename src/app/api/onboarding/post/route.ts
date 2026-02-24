import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/index";
import { userProfiles, userInfoTable, consentLogs } from "@/db/schema";
import { completeOnboardingSchema } from "@/lib/schemas/user";
import { checkUserProfileExists } from "@/lib/user-utils";
import { apiLogger } from "@/lib/logger";
import { Analytics } from "@/lib/analytics";
import { checkRateLimit } from "@/lib/rateLimit";
import { getDocumentVersion } from "@/lib/legal-versions";

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(`user:${session.user.id}`, "standard");
    if (!rl.success) return rl.response!;

    // Check if user already has a profile
    const existingProfile = await checkUserProfileExists(session.user.id);
    if (existingProfile) {
      return NextResponse.json(
        { error: "Profile already exists" },
        { status: 409 },
      );
    }

    // Parse and validate the request body
    const body = await request.json();
    const validationResult = completeOnboardingSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid data", details: validationResult.error.issues },
        { status: 400 },
      );
    }

    const { profile, foodPreferences, consents } = validationResult.data;
    const userId = session.user.id;

    // Insert user profile
    const [userProfile] = await db
      .insert(userProfiles)
      .values({
        userId: userId,
        fullName: profile.fullName,
        // username: profile.username,
        isProfileComplete: true,
      })
      .returning();

    // Insert user food info
    const [userFoodInfoRecord] = await db
      .insert(userInfoTable)
      .values({
        userProfileId: userProfile.id,
        sex: foodPreferences.sex,
        language: profile.language,
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
      })
      .returning();

    // Log GDPR consents (explicit consent given via checkboxes)
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    const consentEntries = [
      { type: "terms_and_privacy" as const, agreed: Boolean(consents.termsAndPrivacy) },
      { type: "medical_disclaimer" as const, agreed: Boolean(consents.medicalDisclaimer) },
      { type: "health_data_processing" as const, agreed: Boolean(consents.healthDataProcessing) },
    ];

    await db.insert(consentLogs).values(
      consentEntries.map((entry) => ({
        userId: userId,
        type: entry.type,
        agreed: entry.agreed,
        ipAddress: ipAddress,
        userAgent: userAgent,
        documentVersion: getDocumentVersion(entry.type),
      })),
    );

    // Template assignment for basic users during onboarding
    const userMembership = session.user.membership?.toLowerCase() || "basic";
    if (userMembership === "basic") {
      try {
        const { assignTemplateToUser } = await import(
          "@/lib/template-assignment"
        );
        const assignmentResult = await assignTemplateToUser(userProfile.id);

        if (assignmentResult.shoppingList) {
          apiLogger.info("Template assigned during onboarding", {
            metadata: {
              userId,
              userProfileId: userProfile.id,
              shoppingListId: assignmentResult.shoppingList.id,
              mealPlanId: assignmentResult.mealPlan?.id,
              templateUsed: assignmentResult.templateUsed,
            },
          });
        } else {
          apiLogger.warn("No template assigned during onboarding", {
            metadata: {
              userId,
              userProfileId: userProfile.id,
              fallbackReason: assignmentResult.fallbackReason,
            },
          });
        }
      } catch (templateError) {
        apiLogger.error(
          "Template assignment failed during onboarding",
          templateError,
          {
            metadata: { userId, userProfileId: userProfile.id },
          },
        );
        // Don't fail onboarding - user can still use the app
      }
    }

    // Track onboarding completion
    await Analytics.onboardingComplete(userId);

    return NextResponse.json({
      success: true,
      message: "Profile created successfully",
      data: { userProfile, userFoodInfo: userFoodInfoRecord },
    });
  } catch (error) {
    apiLogger.error("Error creating profile", error, {
      metadata: { userId: (await auth())?.user?.id },
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
