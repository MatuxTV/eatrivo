import { db } from "@/index"
import { userProfiles } from "@/db/schema"
import { eq } from "drizzle-orm"
import { logger } from "./logger"

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

export async function checkIfUserWithUsernameExists(username: string): Promise<boolean> {
  try {
    const existingUser = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.username, username))
      .limit(1);
    return existingUser.length > 0;
  } catch (error) {
    logger.error("Error checking username", error, {
      context: "UserUtils",
      metadata: { username }
    });
    return false; 
  }
}
