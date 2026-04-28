import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/index";
import { pantryItems, userProfiles } from "@/db/schema";
import { lt, gte, and, eq } from "drizzle-orm";
import { apiLogger } from "@/lib/logger";
import { sendPushToUser } from "@/lib/pwa/sendPushToAll";
import { CacheService } from "@/lib/cache/redis";

// GET /api/cron/check-pantry-expiry
// Checks for pantry items expiring within 3 days and sends push notifications
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Find all pantry items expiring within 3 days
    const expiringItems = await db
      .select({
        itemName: pantryItems.name,
        expiryDate: pantryItems.expiryDate,
        userProfileId: pantryItems.userProfileId,
      })
      .from(pantryItems)
      .where(
        and(
          gte(pantryItems.expiryDate, now),
          lt(pantryItems.expiryDate, threeDaysFromNow),
        ),
      );

    if (expiringItems.length === 0) {
      return NextResponse.json({ notified: 0 });
    }

    // Group by userProfileId
    const byProfile = new Map<string, string[]>();
    for (const item of expiringItems) {
      const existing = byProfile.get(item.userProfileId) ?? [];
      existing.push(item.itemName);
      byProfile.set(item.userProfileId, existing);
    }

    const today = now.toISOString().split("T")[0];
    let notified = 0;

    for (const [userProfileId, itemNames] of byProfile) {
      try {
        // Skip if already notified today (dedup to avoid daily repeat for same items)
        const dedupKey = `pantry-expiry-notified:${userProfileId}:${today}`;
        const alreadyNotified = await CacheService.get(dedupKey);
        if (alreadyNotified) continue;

        // Get the auth userId from userProfileId
        const profile = await db.query.userProfiles.findFirst({
          where: eq(userProfiles.id, userProfileId),
          columns: { userId: true },
        });
        if (!profile) continue;

        const itemList = itemNames.slice(0, 3).join(", ");
        const more =
          itemNames.length > 3 ? ` a ďalšie ${itemNames.length - 3}` : "";

        await sendPushToUser(profile.userId, {
          title: "⚠️ Potraviny čoskoro expirujú",
          body: `${itemList}${more} — skontroluj svoju spajzu.`,
          url: "/home?section=pantry",
        });
        await CacheService.set(dedupKey, true, 23 * 3600); // 23h TTL
        notified++;
      } catch (err) {
        apiLogger.error("Failed to send expiry push", {
          metadata: { userProfileId, err },
        });
      }
    }

    apiLogger.info("check-pantry-expiry cron completed", {
      metadata: { notified },
    });
    return NextResponse.json({ notified, totalItems: expiringItems.length });
  } catch (error) {
    apiLogger.error("check-pantry-expiry cron error", { metadata: { error } });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
