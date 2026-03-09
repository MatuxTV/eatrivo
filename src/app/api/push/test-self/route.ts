import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { sendPushToUser } from "@/lib/pwa/sendPushToAll";

/**
 * POST /api/push/test-self
 * Sends a test push notification to the currently authenticated user.
 * No body required — useful for quick browser / curl testing.
 */
export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = {
    title: "🔔 Test notifikácia",
    body: "Notifikácie fungujú správne! Eatrivo ✅",
    url: "/home",
  };

  try {
    const result = await sendPushToUser(session.user.id, payload);

    if (result.totalSubscriptions === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No push subscriptions found for your account. Subscribe first via the home page.",
          result,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: result.successful > 0,
      message: `Sent to ${result.successful}/${result.totalSubscriptions} device(s). Failed: ${result.failed}. Cleaned expired: ${result.cleaned}.`,
      result,
    });
  } catch (error) {
    console.error("[test-self] Error:", error);
    return NextResponse.json(
      { error: "Failed to send test notification", detail: String(error) },
      { status: 500 }
    );
  }
}
