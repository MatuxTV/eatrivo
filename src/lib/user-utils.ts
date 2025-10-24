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
