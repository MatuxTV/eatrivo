import { resend, DEFAULT_FROM_EMAIL } from "./resend";
import WelcomeEmail from "../components/email-templates/WelcomeEmail";
import ShoppingListNotificationEmail from "../components/email-templates/ShoppingListNotificationEmail";
import AdminNotificationEmail from "../components/email-templates/AdminNotificationEmail";
import FeedbackNotificationEmail from "../components/email-templates/FeedbackNotificationEmail";
import type {
  WelcomeEmailProps,
  ShoppingListNotificationEmailProps,
  AdminNotificationEmailProps,
  FeedbackNotificationEmailProps,
  EmailResponse,
} from "@/types/email.types";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";

/**
 * Send a welcome email to a new user
 */
export async function sendWelcomeEmail(
  userEmail: string,
  props: WelcomeEmailProps
): Promise<EmailResponse> {
  try {
    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: userEmail,
      subject: "Vitajte v Eatrivo! 🎉",
      react: WelcomeEmail({ userName: props.userName }),
    });

    if (error) {
      console.error("Error sending welcome email:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Send admin notification (non-blocking)
    sendAdminNotification({
      emailType: "welcome",
      recipientEmail: userEmail,
      recipientName: props.userName,
      additionalInfo: "Nový používateľ sa zaregistroval",
    }).catch(err => console.error("Failed to send admin notification:", err));

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error("Unexpected error sending welcome email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Send a shopping list notification email to a client
 */
export async function sendShoppingListNotification(
  clientEmail: string,
  props: ShoppingListNotificationEmailProps
): Promise<EmailResponse> {
  try {
    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: clientEmail,
      subject: `Nový Shopping List od ${props.shoppingListDate} 🛒`,
      react: ShoppingListNotificationEmail({
        clientName: props.clientName,
        shoppingListName: props.shoppingListName,
        shoppingListDate: props.shoppingListDate,
        dashboardUrl: props.dashboardUrl,
      }),
    });

    if (error) {
      console.error("Error sending shopping list notification:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error(
      "Unexpected error sending shopping list notification:",
      error
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Send admin notification about sent emails
 */
export async function sendAdminNotification(
  props: AdminNotificationEmailProps
): Promise<EmailResponse> {
  try {
    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `[Eatrivo] Email odoslaný: ${props.emailType === "welcome" ? "Welcome" : "Shopping List"}`,
      react: AdminNotificationEmail(props),
    });

    if (error) {
      console.error("Error sending admin notification:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error("Unexpected error sending admin notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Send feedback notification to admin
 */
export async function sendFeedbackNotification(
  props: FeedbackNotificationEmailProps
): Promise<EmailResponse> {
  try {
    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `[Eatrivo Feedback] ${props.feedbackType === "bug" ? "🐛 Bug Report" : props.feedbackType === "feature" ? "💡 Nápad" : "⚡ Zlepšenie"}: ${props.title}`,
      react: FeedbackNotificationEmail(props),
    });

    if (error) {
      console.error("Error sending feedback notification:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error("Unexpected error sending feedback notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
