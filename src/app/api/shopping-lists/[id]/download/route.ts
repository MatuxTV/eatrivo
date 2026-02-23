import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/../auth";
import { apiLogger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rateLimit";
import { db } from "@/index";
import { shoppingLists, userProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Download endpoint now
 * redirects to the view page,
 * which has client-side PDF generation (html2canvas + jsPDF).
 * This avoids server-side PDF generation dependencies (PhantomJS, etc.)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(`user:${session.user.id}`, "standard");
    if (!rl.success) return rl.response!;

    const { id } = await params;

    // Verify ownership before redirecting
    const [userProfile] = await db
      .select({ id: userProfiles.id, role: userProfiles.role })
      .from(userProfiles)
      .where(eq(userProfiles.userId, session.user.id))
      .limit(1);

    if (!userProfile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = ["admin", "coach"].includes(userProfile.role ?? "");

    const [list] = isAdmin
      ? await db.select({ id: shoppingLists.id }).from(shoppingLists).where(eq(shoppingLists.id, id)).limit(1)
      : await db.select({ id: shoppingLists.id }).from(shoppingLists).where(
          and(eq(shoppingLists.id, id), eq(shoppingLists.userProfileId, userProfile.id)),
        ).limit(1);

    if (!list) {
      return NextResponse.json({ error: "Shopping list not found" }, { status: 404 });
    }

    // Redirect to view page where client-side PDF generation is available
    return NextResponse.redirect(
      new URL(`/api/shopping-lists/${id}/view`, req.url)
    );
  } catch (err) {
    apiLogger.error("[API] Error redirecting to view", err, {
      metadata: { shoppingListId: (await params).id }
    });
    return NextResponse.json(
      { error: "Failed to redirect" },
      { status: 500 }
    );
  }
}
