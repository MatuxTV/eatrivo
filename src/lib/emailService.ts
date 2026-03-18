import { resend, DEFAULT_FROM_EMAIL } from "./resend";
import { getMessages } from "next-intl/server";
import WelcomeEmail from "../components/email-templates/WelcomeEmail";
import ShoppingListNotificationEmail from "../components/email-templates/ShoppingListNotificationEmail";
import AdminNotificationEmail from "../components/email-templates/AdminNotificationEmail";
import FeedbackNotificationEmail from "../components/email-templates/FeedbackNotificationEmail";
import RenewalReminderEmail from "../components/email-templates/RenewalReminderEmail";
import type {
  WelcomeEmailProps,
  ShoppingListNotificationEmailProps,
  AdminNotificationEmailProps,
  FeedbackNotificationEmailProps,
  RenewalReminderEmailProps,
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
  locale: string = "en"
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
    }, locale).catch(err => console.error("Failed to send admin notification:", err));

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
  locale: string = "en"
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
  locale: string = "en"
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
  locale: string = "en"
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

/**
 * Send a renewal reminder email before subscription auto-renews
 * Required by EU consumer protection law (§ 4 ods. 6 zákona č. 108/2024 Z.z.)
 */
export async function sendRenewalReminderEmail(
  userEmail: string,
  props: Omit<RenewalReminderEmailProps, "translations">,
  locale: string = "sk"
): Promise<EmailResponse> {
  try {
    const messages = await getMessages({ locale });
    const translations = (messages.emails as unknown) as EmailTranslations;
    const t = translations?.renewalReminder;

    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: userEmail,
      subject: t?.heading || "Pripomienka obnovenia predplatného 🔔",
      react: RenewalReminderEmail({ ...props, translations }),
    });

    if (error) {
      console.error("Error sending renewal reminder email:", error);
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
    console.error("Unexpected error sending renewal reminder email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function sendPushDoubleOptInEmail(
  userEmail: string,
  props: {
    userName?: string | null;
    confirmUrl: string;
  },
  locale: string = "sk",
): Promise<EmailResponse> {
  const isEnglish = locale === "en";
  const subject = isEnglish
    ? "Confirm push notifications in Eatrivo"
    : "Potvrďte push notifikácie v Eatrivo";
  const greeting = isEnglish
    ? `Hi${props.userName ? ` ${props.userName.split(" ")[0]}` : ""},`
    : `Ahoj${props.userName ? ` ${props.userName.split(" ")[0]}` : ""},`;
  const title = isEnglish ? "Confirm notifications" : "Potvrďte notifikácie";
  const body = isEnglish
    ? "Please confirm that you want to receive Eatrivo push notifications. We will start sending alerts only after this confirmation step."
    : "Prosím potvrďte, že chcete dostávať push notifikácie od Eatrivo. Upozornenia začneme posielať až po tomto potvrdení.";
  const buttonLabel = isEnglish ? "Confirm notifications" : "Potvrdiť notifikácie";
  const footer = isEnglish
    ? "If you did not request this, you can safely ignore this email."
    : "Ak ste o to nepožiadali, tento email môžete bezpečne ignorovať.";

  try {
    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: userEmail,
      subject,
      html: `
        <div style="font-family:Arial,sans-serif;background:#fafafa;padding:32px;color:#111827;">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:24px;padding:32px;box-shadow:0 18px 50px rgba(17,24,39,0.08);">
            <div style="width:56px;height:56px;border-radius:999px;background:rgba(139,92,246,0.12);color:#8b5cf6;font-size:28px;line-height:56px;text-align:center;margin-bottom:20px;">R</div>
            <p style="margin:0 0 12px;font-size:16px;">${greeting}</p>
            <h1 style="margin:0 0 12px;font-size:28px;line-height:1.1;">${title}</h1>
            <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#4b5563;">${body}</p>
            <a href="${props.confirmUrl}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#8b5cf6;color:#ffffff;text-decoration:none;font-weight:700;">${buttonLabel}</a>
            <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">${footer}</p>
          </div>
        </div>
      `,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
