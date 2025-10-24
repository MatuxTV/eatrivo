import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "@/index";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apiLogger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { version } = await request.json();

    if (!version) {
      return NextResponse.json(
        { error: "Version is required" },
        { status: 400 }
      );
    }

    // Update user's last seen welcome dialog version
    await db
      .update(users)
      .set({
        lastSeenWelcomeVersion: version,
        lastSeenWelcomeAt: new Date(),
      })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ 
      success: true,
      message: "Welcome dialog version updated"
    });
  } catch (error) {
    apiLogger.error("Error updating welcome dialog version", error, {
      metadata: { userId: (await auth())?.user?.id }
    });
    return NextResponse.json(
      { error: "Failed to update welcome dialog version" },
      { status: 500 }
    );
  }
}