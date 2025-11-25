export { resend, DEFAULT_FROM_EMAIL } from "../../lib/resend";
export {
  sendWelcomeEmail,
  sendShoppingListNotification,
  sendFeedbackNotification,
} from "../../lib/emailService";
export type {
  WelcomeEmailProps,
  ShoppingListNotificationEmailProps,
  FeedbackNotificationEmailProps,
  EmailResponse,
} from "../../types/email.types";
