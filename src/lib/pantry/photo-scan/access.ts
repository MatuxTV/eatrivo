import "server-only";

import { eq } from "drizzle-orm";

import { auth } from "../../../../auth";
import { db } from "@/index";
import { userInfoTable, userProfiles } from "@/db/schema";
import { validateAndUpdateSubscription } from "@/lib/billing/subscription";
import { unauthorizedError } from "@/lib/safeError";

export interface PhotoScanContext {
  userId: string;
  userProfileId: string;
  isPaid: boolean;
  locale: string;
}

/** Any signed-in user may use photo scan (free users get a smaller daily quota). */
export async function getPhotoScanContext(): Promise<
  { ok: true; context: PhotoScanContext } | { ok: false; response: Response }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, response: unauthorizedError() };
  }

  const [profile] = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.userId, session.user.id));
  if (!profile) {
    return { ok: false, response: Response.json({ error: "Profile not found", code: "PROFILE_NOT_FOUND" }, { status: 404 }) };
  }

  const [subscription, [userInfo]] = await Promise.all([
    validateAndUpdateSubscription(session.user.id),
    db.select({ language: userInfoTable.language }).from(userInfoTable).where(eq(userInfoTable.userProfileId, profile.id)),
  ]);

  const membership = subscription.membership;
  return {
    ok: true,
    context: {
      userId: session.user.id,
      userProfileId: profile.id,
      isPaid: membership === "premium" || membership === "pro" || membership === "trainer",
      locale: userInfo?.language ?? "sk",
    },
  };
}