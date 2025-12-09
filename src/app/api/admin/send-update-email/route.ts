import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { db } from "../../../../";
import { userProfiles, users } from "@/db/schema";
import { eq, isNotNull } from "drizzle-orm";
import { resend, DEFAULT_FROM_EMAIL } from "@/components/email-templates";
import { UpdateNotificationEmail } from "@/components/email-templates/UpdateNotificationEmail";
import { logger } from "@/lib/logger";

interface UpdateItem {
  title: string;
  description: string;
  type: "feature" | "improvement" | "fix";
}

interface SendUpdateEmailRequest {
  version: string;
  updateTitle: string;
  updateDescription: string;
  updates: UpdateItem[];
  testEmail?: string; // If provided, send only to this email for testing
  sendToAll?: boolean;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    // Check if user is admin/trainer
    if (!session?.user?.membership || !["trainer", "admin"].includes(session.user.membership.toLowerCase())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: SendUpdateEmailRequest = await request.json();
    const { version, updateTitle, updateDescription, updates, testEmail, sendToAll } = body;

    // Validate required fields
    if (!version || !updateTitle || !updateDescription || !updates || updates.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: version, updateTitle, updateDescription, updates" },
        { status: 400 }
      );
    }

    // If testEmail is provided, send only to that email
    if (testEmail) {
      const { error } = await resend.emails.send({
        from: DEFAULT_FROM_EMAIL,
        to: testEmail,
        subject: `🎉 Eatrivo ${version} - ${updateTitle}`,
        react: UpdateNotificationEmail({
          recipientName: "Test User",
          version,
          updateTitle,
          updateDescription,
          updates,
        }),
      });

      if (error) {
        logger.error("Failed to send test update email", error);
        return NextResponse.json({ error: "Failed to send test email" }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: "Test email sent successfully",
        sentTo: 1,
      });
    }

    // Send to all users
    if (sendToAll) {
      // Get all users with profiles
      const usersWithProfiles = await db
        .select({
          email: users.email,
          fullName: userProfiles.fullName,
        })
        .from(users)
        .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
        .where(isNotNull(users.email));

      const results = {
        sent: 0,
        failed: 0,
        errors: [] as string[],
      };

      // Send emails in batches to avoid rate limits
      const batchSize = 10;
      for (let i = 0; i < usersWithProfiles.length; i += batchSize) {
        const batch = usersWithProfiles.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (user) => {
            try {
              const { error } = await resend.emails.send({
                from: DEFAULT_FROM_EMAIL,
                to: user.email,
                subject: `🎉 Eatrivo ${version} - ${updateTitle}`,
                react: UpdateNotificationEmail({
                  recipientName: user.fullName || "Používateľ",
                  version,
                  updateTitle,
                  updateDescription,
                  updates,
                }),
              });

              if (error) {
                results.failed++;
                results.errors.push(`${user.email}: ${error.message}`);
              } else {
                results.sent++;
              }
            } catch (err) {
              results.failed++;
              results.errors.push(`${user.email}: ${err instanceof Error ? err.message : "Unknown error"}`);
            }
          })
        );

        // Add small delay between batches
        if (i + batchSize < usersWithProfiles.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      logger.info("Update emails sent", { 
        context: "SendUpdateEmail",
        metadata: { sent: results.sent, failed: results.failed, version } 
      });

      return NextResponse.json({
        success: true,
        message: `Update emails sent to ${results.sent} users`,
        ...results,
      });
    }

    return NextResponse.json(
      { error: "Please specify testEmail or sendToAll: true" },
      { status: 400 }
    );

  } catch (error) {
    logger.error("Error in send-update-email API", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}