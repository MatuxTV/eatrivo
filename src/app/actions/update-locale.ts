"use server";

import { cookies } from "next/headers";
import { auth } from "../../../auth";
import { db } from "@/index";
import { userInfoTable, userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  isLocale,
  LOCALE_COOKIE_NAME,
  LOCALE_COOKIE_MAX_AGE,
  type Locale,
} from "@/i18n/routing";
import { invalidateUserContextCaches } from "@/lib/user/user-context-cache";

/**
 * Update the user's locale preference.
 * Sets a cookie (immediate effect on next request) and persists to DB (long-term).
 */
export async function updateLocale(locale: string) {
  if (!isLocale(locale)) {
    return { error: "Invalid locale" };
  }

  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  // Persist to DB for logged-in users
  const session = await auth();
  if (session?.user?.id) {
    try {
      const profile = await db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, session.user.id),
        columns: { id: true },
      });

      if (profile) {
        await db
          .update(userInfoTable)
          .set({ language: locale as Locale })
          .where(eq(userInfoTable.userProfileId, profile.id));

        await invalidateUserContextCaches(session.user.id);
      }
    } catch (error) {
      console.error("Failed to persist locale to DB:", error);
      // Cookie is already set — user will have the correct locale on next request
    }
  }

  return { success: true };
}
