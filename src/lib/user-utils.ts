import { db } from "@/index"
import { userProfiles } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function checkUserProfileExists(userId: string) {
  try {
    const existingProfile = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1)

    return existingProfile.length > 0 ? existingProfile[0] : null
  } catch (error) {
    console.error("Error checking user profile:", error)
    return null
  }
}
