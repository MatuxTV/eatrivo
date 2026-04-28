import type { NextRequest } from "next/server";
import { auth } from "../../../../auth";
import { db } from "../../../../src/index";
import { feedback, userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sendFeedbackNotification } from "@/lib/email/emailService";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";
import { unauthorizedError } from "@/lib/safeError";
import { NextResponse } from "next/server";
import { getUserLanguage } from "@/lib/user/user-utils";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return unauthorizedError("Please sign in to submit feedback");
    }

    // Rate limit: 3 feedback submissions per minute
    const rateLimitResult = await checkRateLimit(
      getRateLimitIdentifier(request, session.user.id),
      "feedback",
    );
    if (!rateLimitResult.success) {
      return rateLimitResult.response!;
    }

    const body = await request.json();
    const { type, title, description } = body;

    // Validation
    if (!type || !title || !description) {
      return NextResponse.json(
        { error: "Missing required fields: type, title, description" },
        { status: 400 },
      );
    }

    if (!["bug", "feature", "improvement"].includes(type)) {
      return NextResponse.json(
        {
          error: "Invalid feedback type. Must be: bug, feature, or improvement",
        },
        { status: 400 },
      );
    }

    if (title.length < 3 || title.length > 200) {
      return NextResponse.json(
        { error: "Title must be between 3 and 200 characters" },
        { status: 400 },
      );
    }

    if (description.length < 10 || description.length > 2000) {
      return NextResponse.json(
        { error: "Description must be between 10 and 2000 characters" },
        { status: 400 },
      );
    }

    // Get user profile
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id as string),
    });

    // Get user's language preference
    const userLocale = await getUserLanguage(session.user.email);

    // Insert feedback into database
    const [newFeedback] = await db
      .insert(feedback)
      .values({
        userProfileId: userProfile?.id || null,
        userEmail: session.user.email,
        userName: userProfile?.fullName || session.user.name || "Anonymous",
        type,
        title,
        description,
        status: "new",
      })
      .returning();

    // Send email notification to admin (non-blocking)
    sendFeedbackNotification({
      userName: userProfile?.fullName || session.user.name || "Anonymous",
      userEmail: session.user.email,
      feedbackType: type,
      title,
      description,
      feedbackId: newFeedback.id,
    }, userLocale).catch((error) => {
      console.error("Failed to send feedback notification email:", error);
    });

    return NextResponse.json({
      success: true,
      message: "Feedback submitted successfully",
      feedbackId: newFeedback.id,
    });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
