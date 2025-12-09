import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/index";
import { userProfiles, userInfoTable, weightHistory } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const weightSchema = z.object({
  weight: z.number().min(20).max(500),
  note: z.string().optional(),
});

// GET /api/user/weight - Get weight history
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [userProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id));

    if (!userProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Get weight history (last 30 entries)
    const history = await db
      .select()
      .from(weightHistory)
      .where(eq(weightHistory.userProfileId, userProfile.id))
      .orderBy(desc(weightHistory.recordedAt))
      .limit(30);

    // Get current weight from userInfo
    const [userInfo] = await db
      .select()
      .from(userInfoTable)
      .where(eq(userInfoTable.userProfileId, userProfile.id));

    return NextResponse.json({
      currentWeight: userInfo?.weight ? parseFloat(String(userInfo.weight)) : null,
      history: history.map((h) => ({
        id: h.id,
        weight: parseFloat(String(h.weight)),
        recordedAt: h.recordedAt,
        note: h.note,
      })),
    });
  } catch (error) {
    console.error("Error fetching weight history:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/user/weight - Add new weight entry
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = weightSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400 }
      );
    }

    const [userProfile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id));

    if (!userProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Insert into weight history
    const [newEntry] = await db
      .insert(weightHistory)
      .values({
        userProfileId: userProfile.id,
        weight: String(validation.data.weight),
        note: validation.data.note,
      })
      .returning();

    // Update current weight in userInfoTable
    await db
      .update(userInfoTable)
      .set({ weight: String(validation.data.weight) })
      .where(eq(userInfoTable.userProfileId, userProfile.id));

    return NextResponse.json({
      success: true,
      entry: {
        id: newEntry.id,
        weight: parseFloat(String(newEntry.weight)),
        recordedAt: newEntry.recordedAt,
        note: newEntry.note,
      },
    });
  } catch (error) {
    console.error("Error adding weight entry:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
