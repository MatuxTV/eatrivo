export interface WelcomeEmailProps {
  userName: string;
  userEmail: string;
}

export interface ShoppingListNotificationEmailProps {
  clientName: string;
  clientEmail: string;
  shoppingListName: string;
  shoppingListDate: string;
  dashboardUrl?: string;
}

export interface AdminNotificationEmailProps {
  emailType: "welcome" | "shopping-list";
  recipientEmail: string;
  recipientName: string;
  additionalInfo?: string;
}

export interface FeedbackNotificationEmailProps {
  userName: string;
  userEmail: string;
  feedbackType: "bug" | "feature" | "improvement";
  title: string;
  description: string;
  feedbackId: string;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}
