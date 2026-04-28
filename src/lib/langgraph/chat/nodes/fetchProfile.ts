import { db } from "@/index";
import { userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserContext } from "@/lib/user/user-context-cache";
import type { ChatState } from "../state";

export async function fetchProfile(
  state: typeof ChatState.State,
): Promise<Partial<typeof ChatState.State>> {
  const { userProfileId } = state;

  try {
    const [profile] = await db
      .select({ userId: userProfiles.userId })
      .from(userProfiles)
      .where(eq(userProfiles.id, userProfileId));

    if (!profile) throw new Error(`Profile not found: ${userProfileId}`);

    const context = await getUserContext(profile.userId);

    return {
      userProfile: context.userProfile,
      userInfo: context.userInfo,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "fetch_profile failed",
    };
  }
}
