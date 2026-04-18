import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import {
  sendWelcomeEmail,
  sendShoppingListNotification,
} from "@/lib/emailService";
import { db } from "@/index";
import { userProfiles } from "@/db/schema";
import { getUserLanguage } from "@/lib/user-utils";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";
import { eq } from "drizzle-orm";

/**
 * Email sending endpoint - PROTECTED
 * POST /api/send-email
 *
 * - Welcome emails: Authenticated users can send to themselves
 * - Shopping list emails: Admin only
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication required
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized - please sign in" },
        { status: 401 },
      );
    }

    // Rate limit: 3 emails per minute
    const rateLimitId = getRateLimitIdentifier(request, session.user.id);
    const rateLimit = await checkRateLimit(rateLimitId, "feedback");
    if (!rateLimit.success) return rateLimit.response!;

    const body = await request.json();
    const { type, to, ...props } = body;

    if (!type || !to) {
      return NextResponse.json(
        { error: "Missing required fields: type and to" },
        { status: 400 },
      );
    }

    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
      columns: { role: true },
    });

    // Users can only send welcome emails to themselves.
    // Administrative sends are restricted to the admin role.
    const isAdmin = userProfile?.role === "admin";

    if (!isAdmin && to !== session.user.email) {
      return NextResponse.json(
        { error: "You can only send emails to yourself" },
        { status: 403 },
      );
    }

    // Get recipient's language preference
    const userLocale = await getUserLanguage(to);

    let result;

    switch (type) {
      case "welcome":
        if (!props.userName) {
          return NextResponse.json(
            { error: "Missing userName for welcome email" },
            { status: 400 },
          );
        }
        result = await sendWelcomeEmail(to, {
          userName: props.userName,
          userEmail: to,
        }, userLocale);
        break;

      case "shopping-list":
        if (!isAdmin) {
          return NextResponse.json(
            { error: "Forbidden" },
            { status: 403 },
          );
        }
        if (
          !props.clientName ||
          !props.shoppingListName ||
          !props.shoppingListDate
        ) {
          return NextResponse.json(
            {
              error:
                "Missing required fields for shopping list notification: clientName, shoppingListName, shoppingListDate, itemCount",
            },
            { status: 400 },
          );
        }
        result = await sendShoppingListNotification(to, {
          clientName: props.clientName,
          clientEmail: to,
          shoppingListName: props.shoppingListName,
          shoppingListDate: props.shoppingListDate,
          homeUrl: props.homeUrl,
        }, userLocale);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown email type: ${type}` },
          { status: 400 },
        );
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `${type} email sent successfully`,
        messageId: result.messageId,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error in test-email endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
