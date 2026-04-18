export interface EmailTranslations {
  common: {
    footerTagline: string;
    footerDisclaimer: string;
    footerDisclaimerShopping?: string;
    footerDisclaimerFeedback?: string;
    copyright: string;
    links: {
      web: string;
      home: string;
      support: string;
    };
  };
  welcome?: {
    preview: string;
    heading: string;
    subtitle: string;
    greeting: string;
    paragraph: string;
    features: {
      dailyPlan: { title: string; description: string };
      shoppingLists: { title: string; description: string };
      aiAssistant: { title: string; description: string };
    };
    cta: string;
    help: string;
  };
  shoppingList?: {
    preview: string;
    heading: string;
    subtitle: string;
    greeting: string;
    paragraph: string;
    labels: {
      name: string;
      dateFrom: string;
    };
    tip: {
      title: string;
      text: string;
    };
    cta: string;
    help: string;
  };
  admin?: {
    preview: string;
    heading: string;
    subtitle: string;
    success: string;
    labels: {
      type: string;
      recipient: string;
      name: string;
      details: string;
      sentAt: string;
    };
    footer: string;
    types: {
      welcome: string;
      shoppingList: string;
    };
  };
  feedback?: {
    preview: string;
    heading: string;
    greeting: string;
    text: string;
    labels: {
      type: string;
      user: string;
      email: string;
      title: string;
      description: string;
      id: string;
    };
    types: {
      bug: string;
      feature: string;
      improvement: string;
    };
  };
  update?: {
    preview: string;
    heroLabel: string;
    greeting: string;
    intro: string;
    cta: string;
    footer: string;
  };
  renewalReminder?: {
    preview: string;
    heading: string;
    greeting: string;
    paragraph: string;
    details: {
      plan: string;
      renewalDate: string;
      amount: string;
    };
    cancelInfo: string;
    cancelCta: string;
    keepCta: string;
    footer: string;
  };
}

export interface WelcomeEmailProps {
  userName: string;
  userEmail: string;
  translations?: EmailTranslations;
}

export interface ShoppingListNotificationEmailProps {
  clientName: string;
  clientEmail: string;
  shoppingListName: string;
  shoppingListDate: string;
  homeUrl?: string;
  translations?: EmailTranslations;
}

export interface AdminNotificationEmailProps {
  emailType: "welcome" | "shopping-list";
  recipientEmail: string;
  recipientName: string;
  additionalInfo?: string;
  translations?: EmailTranslations;
}

export interface FeedbackNotificationEmailProps {
  userName: string;
  userEmail: string;
  feedbackType: "bug" | "feature" | "improvement";
  title: string;
  description: string;
  feedbackId: string;
  translations?: EmailTranslations;
}

export interface UpdateNotificationEmailProps {
  recipientName: string;
  version: string;
  updateTitle: string;
  updateDescription: string;
  updates: Array<{
    title: string;
    description: string;
    type: "feature" | "improvement" | "fix";
  }>;
  homeUrl?: string;
  translations?: EmailTranslations;
}

export interface RenewalReminderEmailProps {
  userName: string;
  planName: string;
  renewalDate: string;
  amount: string;
  currency: string;
  manageUrl?: string;
  translations?: EmailTranslations;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}
