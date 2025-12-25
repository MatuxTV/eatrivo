import { resend, DEFAULT_FROM_EMAIL } from "./resend";
import { getMessages } from "next-intl/server";
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
  EmailTranslations,
} from "@/types/email.types";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";

/**
 * Send a welcome email to a new user
 */
export async function sendWelcomeEmail(
  userEmail: string,
  props: Omit<WelcomeEmailProps, "translations">,
  locale: string = "sk"
): Promise<EmailResponse> {
  try {
    const messages = await getMessages({ locale });
    const translations = (messages.emails as unknown) as EmailTranslations;

    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: userEmail,
      subject: translations?.welcome?.heading || "Vitajte v Eatrivo! 🎉",
      react: WelcomeEmail({ ...props, translations }),
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
  props: Omit<ShoppingListNotificationEmailProps, "translations">,
  locale: string = "sk"
): Promise<EmailResponse> {
  try {
    const messages = await getMessages({ locale });
    const translations = (messages.emails as unknown) as EmailTranslations;

    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: clientEmail,
      subject: translations?.shoppingList?.heading || `Nový Shopping List od ${props.shoppingListDate} 🛒`,
      react: ShoppingListNotificationEmail({
        ...props,
        translations,
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
  props: Omit<AdminNotificationEmailProps, "translations">,
  locale: string = "sk"
): Promise<EmailResponse> {
  try {
    const messages = await getMessages({ locale });
    const translations = (messages.emails as unknown) as EmailTranslations;
    const t = translations?.admin;

    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: (t?.preview || "[Eatrivo] Email odoslaný: {emailType}").replace("{emailType}", props.emailType === "welcome" ? "Welcome" : "Shopping List"),
      react: AdminNotificationEmail({ ...props, translations }),
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
  props: Omit<FeedbackNotificationEmailProps, "translations">,
  locale: string = "sk"
): Promise<EmailResponse> {
  try {
    const messages = await getMessages({ locale });
    const translations = (messages.emails as unknown) as EmailTranslations;
    const t = translations?.feedback;

    const typeLabel = props.feedbackType === "bug" 
      ? (t?.types?.bug || "Bug Report")
      : props.feedbackType === "feature" 
        ? (t?.types?.feature || "Napad na vylepsenie")
        : (t?.types?.improvement || "Zlepsenie");

    // The original subject was: `[Eatrivo Feedback] ${typeLabel}: ${props.title}`
    
    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `[Eatrivo Feedback] ${props.feedbackType === "bug" ? "🐛" : props.feedbackType === "feature" ? "💡" : "⚡"} ${typeLabel}: ${props.title}`,
      react: FeedbackNotificationEmail({ ...props, translations }),
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
