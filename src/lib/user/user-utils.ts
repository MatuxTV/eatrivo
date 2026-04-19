import { db } from "@/index"
import { userProfiles, userInfoTable, users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { logger } from "../logger"

export async function checkUserProfileExists(userId: string) {
  try {
    const existingProfile = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1)

    return existingProfile.length > 0 ? existingProfile[0] : null
  } catch (error) {
    logger.error("Error checking user profile", error, {
      context: "UserUtils",
      metadata: { userId }
    })
    return null
  }
}

/**
 * Get user's preferred language from their profile
 * Falls back to 'en' if not found
 */
export async function getUserLanguage(userEmail: string): Promise<'en' | 'sk'> {
  try {
    // First, get the user ID from email
    const user = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1)

    if (user.length === 0) {
      logger.warn("User not found when getting language", {
        context: "UserUtils",
        metadata: { userEmail }
      })
      return 'en' // Default to English
    }

    // Get the user profile
    const profile = await db
      .select({ id: userProfiles.id })
      .from(userProfiles)
      .where(eq(userProfiles.userId, user[0].id))
      .limit(1)

    if (profile.length === 0) {
      logger.warn("User profile not found when getting language", {
        context: "UserUtils",
        metadata: { userEmail }
      })
      return 'en' // Default to English
    }

    // Get the user info with language
    const userInfo = await db
      .select({ language: userInfoTable.language })
      .from(userInfoTable)
      .where(eq(userInfoTable.userProfileId, profile[0].id))
      .limit(1)

    if (userInfo.length === 0 || !userInfo[0].language) {
      logger.info("User language not set, defaulting to English", {
        context: "UserUtils",
        metadata: { userEmail }
      })
      return 'en' // Default to English
    }

    return userInfo[0].language as 'en' | 'sk'
  } catch (error) {
    logger.error("Error getting user language", error, {
      context: "UserUtils",
      metadata: { userEmail }
    })
    return 'en' // Default to English on error
  }
}

// export async function checkIfUserWithUsernameExists(username: string): Promise<boolean> {
//   try {
//     const existingUser = await db
//       .select()
//       .from(userProfiles)
//       .where(eq(userProfiles.username, username))
//       .limit(1);
//     return existingUser.length > 0;
//   } catch (error) {
//     logger.error("Error checking username", error, {
//       context: "UserUtils",
//       metadata: { username }
//     });
//     return false; 
//   }
// }
