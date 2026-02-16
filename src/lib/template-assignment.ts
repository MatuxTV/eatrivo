import { db } from "@/index";
import {
  shoppingListTemplates,
  mealPlanTemplates,
  templateAssignments,
  shoppingLists,
  mealPlans,
  userInfoTable,
  userProfiles,
  users,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiLogger } from "@/lib/logger";
import { type Goal, type Diet } from "@/lib/schemas/template";
import { RequestLock } from "@/lib/redis";

interface AssignmentResult {
  shoppingList: typeof shoppingLists.$inferSelect | null;
  mealPlan: typeof mealPlans.$inferSelect | null;
  templateUsed: boolean;
  fallbackReason?: string;
}

/**
 * Find a shopping list template matching the given goal and diet
 */
async function findTemplate(goal: Goal, diet: Diet) {
  return await db.query.shoppingListTemplates.findFirst({
    where: and(
      eq(shoppingListTemplates.goal, goal),
      eq(shoppingListTemplates.diet, diet),
      eq(shoppingListTemplates.isActive, true),
    ),
  });
}

/**
 * Find meal plan template for a given shopping list template
 */
async function findMealPlanTemplate(shoppingListTemplateId: string) {
  return await db.query.mealPlanTemplates.findFirst({
    where: and(
      eq(mealPlanTemplates.shoppingListTemplateId, shoppingListTemplateId),
      eq(mealPlanTemplates.isActive, true),
    ),
  });
}

/**
 * Get the date range from today to the closest upcoming Sunday
 * Start: Today at 00:00:00
 * End: Closest Sunday at 23:59:59 (even if today is Sunday, use next Sunday)
 */
function getWeekDates() {
  const now = new Date();

  // Start date is today at midnight
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);

  // End date is the closest upcoming Sunday
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek; // If Sunday, use next Sunday (7 days)

  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + daysUntilSunday);
  weekEnd.setHours(23, 59, 59, 999);

  return { start: weekStart, end: weekEnd };
}

/**
 * Create a shopping list from a template
 */
async function createShoppingListFromTemplate(
  userProfileId: string,
  template: typeof shoppingListTemplates.$inferSelect,
  weekDates: { start: Date; end: Date },
  language: string = "sk",
) {
  // Generate accurate title based on date range
  const title = language === "en"
    ? `Shopping List - ${weekDates.start.toLocaleDateString("en-US", { month: "long", day: "numeric" })} - ${weekDates.end.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`
    : `Nákupný zoznam - ${weekDates.start.toLocaleDateString("sk-SK", { day: "numeric", month: "long" })} - ${weekDates.end.toLocaleDateString("sk-SK", { day: "numeric", month: "long" })}`;

  const [shoppingList] = await db
    .insert(shoppingLists)
    .values({
      userProfileId,
      title,
      description: template.description,
      markdownContent: template.markdownContent,
      weekStartDate: weekDates.start,
      weekEndDate: weekDates.end,
      status: "active",
    })
    .returning();

  return shoppingList;
}

/**
 * Create a meal plan from a template
 */
async function createMealPlanFromTemplate(
  userProfileId: string,
  shoppingListId: string,
  template: typeof mealPlanTemplates.$inferSelect,
  weekDates: { start: Date; end: Date },
) {
  const [mealPlan] = await db
    .insert(mealPlans)
    .values({
      userProfileId,
      shoppingListId,
      weekStartDate: weekDates.start,
      weekEndDate: weekDates.end,
      meals: template.meals,
    })
    .returning();

  return mealPlan;
}

/**
 * Log template assignment for analytics
 */
async function logTemplateAssignment(
  userProfileId: string,
  template: typeof shoppingListTemplates.$inferSelect,
  shoppingList: typeof shoppingLists.$inferSelect,
  mealPlan: typeof mealPlans.$inferSelect | null,
  mealPlanTemplate: typeof mealPlanTemplates.$inferSelect | null,
) {
  await db.insert(templateAssignments).values({
    userProfileId,
    shoppingListTemplateId: template.id,
    mealPlanTemplateId: mealPlanTemplate?.id || null,
    shoppingListId: shoppingList.id,
    mealPlanId: mealPlan?.id || null,
    goal: template.goal,
    diet: template.diet,
  });
}

/**
 * Get user info including goal and diet
 */
async function getUserInfo(userProfileId: string) {
  const userInfo = await db.query.userInfoTable.findFirst({
    where: eq(userInfoTable.userProfileId, userProfileId),
  });

  if (!userInfo) {
    throw new Error(`User info not found for profile ${userProfileId}`);
  }

  return userInfo;
}

/**
 * Get user by profile ID
 */
async function getUserByProfileId(userProfileId: string) {
  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.id, userProfileId),
  });

  if (!userProfile) {
    throw new Error(`User profile not found: ${userProfileId}`);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userProfile.userId),
  });

  if (!user) {
    throw new Error(`User not found for profile ${userProfileId}`);
  }

  return user;
}

/**
 * Assign a template to a user based on their goal and diet preferences
 * Only assigns to basic tier users
 * If no template exists, returns null (basic users only get templates, not AI generation)
 * Uses Redis locking to prevent duplicate concurrent assignments
 */
export async function assignTemplateToUser(
  userProfileId: string,
): Promise<AssignmentResult> {
  const lockKey = `template-assignment:${userProfileId}`;
  const lockTTL = 60; // 60 seconds lock duration

  try {
    // Acquire lock to prevent duplicate concurrent assignments
    const lockAcquired = await RequestLock.acquire(lockKey, lockTTL);

    if (!lockAcquired) {
      apiLogger.warn("Template assignment already in progress for user", {
        metadata: { userProfileId },
      });
      return {
        shoppingList: null,
        mealPlan: null,
        templateUsed: false,
        fallbackReason: "Assignment already in progress",
      };
    }

    // Get user's goal + diet from userInfoTable
    const userInfo = await getUserInfo(userProfileId);

    // Check user's membership (basic users only)
    const user = await getUserByProfileId(userProfileId);

    if (user.membership !== "basic") {
      apiLogger.info("Skipping template assignment for non-basic user", {
        metadata: {
          userProfileId,
          membership: user.membership,
        },
      });
      return {
        shoppingList: null,
        mealPlan: null,
        templateUsed: false,
        fallbackReason: "User is not basic tier",
      };
    }

    const weekDates = getWeekDates();
    const language = userInfo.language === "en" ? "en" : "sk";

    // Find matching active template
    const template = await findTemplate(
      userInfo.goal,
      userInfo.diet_preferences || "none",
    );

    // If no template found, return null (basic users only get templates)
    if (!template) {
      apiLogger.warn("No template found for user's goal and diet", {
        metadata: {
          userProfileId,
          goal: userInfo.goal,
          diet: userInfo.diet_preferences,
        },
      });
      return {
        shoppingList: null,
        mealPlan: null,
        templateUsed: false,
        fallbackReason: `No template found for goal=${userInfo.goal} diet=${userInfo.diet_preferences}`,
      };
    }

    // Copy template to user's shopping list
    const shoppingList = await createShoppingListFromTemplate(
      userProfileId,
      template,
      weekDates,
      language,
    );

    // Copy meal plan template if exists
    let mealPlan = null;
    let mealPlanTemplate = null;

    try {
      mealPlanTemplate = await findMealPlanTemplate(template.id);
      if (mealPlanTemplate) {
        mealPlan = await createMealPlanFromTemplate(
          userProfileId,
          shoppingList.id,
          mealPlanTemplate,
          weekDates,
        );
      }
    } catch (error) {
      apiLogger.error("Failed to create meal plan from template", error, {
        metadata: { userProfileId, shoppingListId: shoppingList.id },
      });
      // Continue - shopping list was created successfully
    }

    // Log assignment
    await logTemplateAssignment(
      userProfileId,
      template,
      shoppingList,
      mealPlan,
      mealPlanTemplate,
    );

    apiLogger.info("Successfully assigned template to user", {
      metadata: {
        userProfileId,
        templateId: template.id,
        shoppingListId: shoppingList.id,
        mealPlanId: mealPlan?.id,
        goal: template.goal,
        diet: template.diet,
      },
    });

    return {
      shoppingList,
      mealPlan,
      templateUsed: true,
    };
  } catch (error) {
    apiLogger.error("Error in assignTemplateToUser", error, {
      metadata: { userProfileId },
    });
    throw error;
  } finally {
    // Always release lock
    try {
      await RequestLock.release(lockKey);
    } catch (lockError) {
      apiLogger.error("Failed to release assignment lock", lockError, {
        metadata: { userProfileId, lockKey },
      });
    }
  }
}
