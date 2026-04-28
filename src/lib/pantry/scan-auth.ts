import { eq } from "drizzle-orm";

import { auth } from "../../../auth";
import { db } from "@/index";
import { userProfiles } from "@/db/schema";
import { validateAndUpdateSubscription } from "@/lib/billing/subscription";
import { forbiddenError, unauthorizedError } from "@/lib/safeError";

export type PaidMembership = "premium" | "pro" | "trainer";

export interface AuthenticatedPaidPantryContext {
  userId: string;
  userProfileId: string;
  membership: PaidMembership;
}

export async function getAuthenticatedPaidPantryContext(): Promise<
  | { ok: true; context: AuthenticatedPaidPantryContext }
  | { ok: false; response: Response }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, response: unauthorizedError() };
  }

  const subscriptionStatus = await validateAndUpdateSubscription(session.user.id);
  if (
    subscriptionStatus.membership !== "premium" &&
    subscriptionStatus.membership !== "pro" &&
    subscriptionStatus.membership !== "trainer"
  ) {
    return {
      ok: false,
      response: forbiddenError("Premium subscription required"),
    };
  }

  const [profile] = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.userId, session.user.id));

  if (!profile) {
    return {
      ok: false,
      response: Response.json({ error: "Profile not found" }, { status: 404 }),
    };
  }

  return {
    ok: true,
    context: {
      userId: session.user.id,
      userProfileId: profile.id,
      membership: subscriptionStatus.membership,
    },
  };
}