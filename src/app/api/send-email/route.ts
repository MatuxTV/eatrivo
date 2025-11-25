import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  sendWelcomeEmail,
  sendShoppingListNotification,
} from "@/lib/emailService";

/**
 * Test endpoint for sending emails
 * POST /api/test-email
 *
 * Body examples:
 *
 * Welcome email:
 * {
 *   "type": "welcome",
 *   "to": "user@example.com",
 *   "userName": "John Doe"
 * }
 *
 * Shopping list notification:
 * {
 *   "type": "shopping-list",
 *   "to": "client@example.com",
 *   "clientName": "Jane Smith",
 *   "shoppingListName": "Týždenný nákup",
 *   "shoppingListDate": "25.11.2025",
 *   "dashboardUrl": "https://eatrivo.com/dashboard"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, to, ...props } = body;

    if (!type || !to) {
      return NextResponse.json(
        { error: "Missing required fields: type and to" },
        { status: 400 }
      );
    }

    let result;

    switch (type) {
      case "welcome":
        if (!props.userName) {
          return NextResponse.json(
            { error: "Missing userName for welcome email" },
            { status: 400 }
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
            { status: 400 }
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
          { status: 400 }
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
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in test-email endpoint:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
