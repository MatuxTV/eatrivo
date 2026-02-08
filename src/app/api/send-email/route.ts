import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "../../../../auth";
import {
  sendWelcomeEmail,
  sendShoppingListNotification,
} from "@/lib/emailService";

/**
 * Email sending endpoint - PROTECTED
 * POST /api/send-email
 *
 * - Welcome emails: Authenticated users can send to themselves
 * - Shopping list emails: Admin/Trainer only
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

    const body = await request.json();
    const { type, to, ...props } = body;

    if (!type || !to) {
      return NextResponse.json(
        { error: "Missing required fields: type and to" },
        { status: 400 },
      );
    }

    // Security: Users can only send welcome emails to themselves
    // Admins/trainers can send to anyone
    const isAdmin = ["trainer", "admin"].includes(
      session.user.membership?.toLowerCase() || "",
    );

    if (!isAdmin && to !== session.user.email) {
      return NextResponse.json(
        { error: "You can only send emails to yourself" },
        { status: 403 },
      );
    }

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
        });
        break;

      case "shopping-list":
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
          dashboardUrl: props.dashboardUrl,
        });
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
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
