import { eq } from "drizzle-orm";

import { feedback, userProfiles, users } from "@/db/schema";
import { db } from "@/index";
import { apiLogger } from "@/lib/logger";

interface ReportIngredientResolutionFeedbackInput {
  source: string;
  rawName: string;
  locale: string;
  userId?: string | null;
  userProfileId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
}

export async function reportIngredientResolutionFeedback(
  input: ReportIngredientResolutionFeedbackInput,
): Promise<boolean> {
  try {
    let resolvedUserProfileId = input.userProfileId ?? null;
    let resolvedUserEmail = input.userEmail ?? null;
    let resolvedUserName = input.userName ?? null;

    if (!resolvedUserProfileId && input.userId) {
      const [profile] = await db
        .select({
          id: userProfiles.id,
          fullName: userProfiles.fullName,
        })
        .from(userProfiles)
        .where(eq(userProfiles.userId, input.userId))
        .limit(1);

      resolvedUserProfileId = profile?.id ?? null;
      resolvedUserName = resolvedUserName ?? profile?.fullName ?? null;
    }

    if ((!resolvedUserEmail || !resolvedUserName) && input.userId) {
      const [user] = await db
        .select({
          email: users.email,
          name: users.name,
        })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      resolvedUserEmail = resolvedUserEmail ?? user?.email ?? null;
      resolvedUserName = resolvedUserName ?? user?.name ?? null;
    }

    if ((!resolvedUserEmail || !resolvedUserName) && resolvedUserProfileId) {
      const [row] = await db
        .select({
          email: users.email,
          name: users.name,
          fullName: userProfiles.fullName,
        })
        .from(userProfiles)
        .innerJoin(users, eq(userProfiles.userId, users.id))
        .where(eq(userProfiles.id, resolvedUserProfileId))
        .limit(1);

      resolvedUserEmail = resolvedUserEmail ?? row?.email ?? null;
      resolvedUserName = resolvedUserName ?? row?.fullName ?? row?.name ?? null;
    }

    if (!resolvedUserEmail) {
      apiLogger.warn(
        "[ingredient-resolution.feedback] missing user email, skipping feedback record",
        {
          metadata: {
            source: input.source,
            rawName: input.rawName,
            locale: input.locale,
            userId: input.userId ?? null,
            userProfileId: resolvedUserProfileId,
          },
        },
      );
      return false;
    }

    const title = `Ingredient recognition failed: ${input.rawName}`;
    const occurredAt = new Date().toISOString();

    await db.insert(feedback).values({
      userProfileId: resolvedUserProfileId,
      userEmail: resolvedUserEmail,
      userName: resolvedUserName ?? "Anonymous",
      type: "bug",
      title,
      description:
        `The system could not recognize this pantry item as a food item and failed to generate canonical ingredient keys.\n\n` +
        `Occurred at: ${occurredAt}\n` +
        `Source: ${input.source}\n` +
        `Raw name: ${input.rawName}\n` +
        `Locale: ${input.locale}`,
      status: "new",
    });

    return true;
  } catch (error) {
    apiLogger.error(
      "[ingredient-resolution.feedback] failed to store feedback",
      error,
      {
        metadata: {
          source: input.source,
          rawName: input.rawName,
          locale: input.locale,
          userId: input.userId ?? null,
          userProfileId: input.userProfileId ?? null,
        },
      },
    );

    return false;
  }
}