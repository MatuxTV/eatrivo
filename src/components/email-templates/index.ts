export { resend, DEFAULT_FROM_EMAIL } from "../../lib/email/resend";
export {
  sendWelcomeEmail,
  sendShoppingListNotification,
  sendFeedbackNotification,
  sendRenewalReminderEmail,
} from "../../lib/email/emailService";
export type {
  WelcomeEmailProps,
  ShoppingListNotificationEmailProps,
  FeedbackNotificationEmailProps,
  RenewalReminderEmailProps,
  EmailResponse,
} from "../../types/email.types";
export { UpdateNotificationEmail } from "./UpdateNotificationEmail";
export { RenewalReminderEmail } from "./RenewalReminderEmail";
