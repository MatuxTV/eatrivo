import {
  pgTable,
  uuid,
  text,
  pgEnum,
  timestamp,
  integer,
  jsonb,
  numeric,
  primaryKey,
  boolean,
} from "drizzle-orm/pg-core";

// Define the role enum
export const roleEnum = pgEnum("role", ["user", "coach", "admin"]);
export const sexEnum = pgEnum("sex", ["man", "woman"]);
export const activityLevelEnum = pgEnum("activity_level", [
  "sedentary",
  "lightly_active",
  "moderately_active",
  "very_active",
  "athlete",
]);
export const dietEnum = pgEnum("diet", [
  "none",
  "lactosefree",
  "vegetarian",
  "vegan",
  "pescatarian",
  "ketogenic",
  "paleolithic",
]);
export const timePrefEnum = pgEnum("time_pref", ["quick", "normal", "slow"]);
export const budgetEnum = pgEnum("budget", ["low", "medium", "high"]);
export const membershipEnum = pgEnum("membership", [
  "basic",
  "premium",
  "pro",
  "trainer",
]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "past_due",
  "gifted",
]);
export const shoppingListStatusEnum = pgEnum("shopping_list_status", [
  "active",
  "completed",
  "cancelled",
]);
export const goalEnum = pgEnum("goal", [
  "lose_weight",
  "maintain_weight",
  "gain_muscle",
]);
export const languageEnum = pgEnum("language", ["sk", "en"]);
export const consentTypeEnum = pgEnum("consent_type", [
  "terms_and_privacy",
  "medical_disclaimer",
  "health_data_processing",
]);

export const foodItems = pgTable("food_items", {
  id: integer("id").primaryKey().notNull(),
  name: text().notNull(),
  category: text(),
  unit: text(),
  kcalPerUnit: integer("kcal_per_unit"),
  protein: numeric(),
  carbs: numeric(),
  fat: numeric(),
});

// NextAuth users table (minimal, just for OAuth)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  membership: membershipEnum("membership").default("basic").notNull(),
  image: text("image"),
  stripeCustomerId: text("stripe_customer_id"),
  //Stamp for NewUpdate window tracking
  lastSeenWelcomeVersion: text("last_seen_welcome_version"),
  lastSeenWelcomeAt: timestamp("last_seen_welcome_at", { withTimezone: true }),
  // PWA install prompt preference
  hideInstallPrompt: boolean("hide_install_prompt").default(false).notNull(),
});

// Your app's main user profile table
export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fullName: text("fullName").notNull(),
  // username: text("username").unique(),
  role: roleEnum("role").default("user").notNull(),
  isProfileComplete: boolean("isProfileComplete").default(false).notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Extended user info for food preferences
export const userInfoTable = pgTable("user_info", {
  id: uuid("id").primaryKey().defaultRandom(),
  userProfileId: uuid("userProfileId")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  sex: sexEnum("sex").notNull(),
  language: languageEnum("language").default("sk").notNull(),
  dateOfBirth: timestamp("dateOfBirth"),
  height: integer("height").notNull(),
  weight: numeric("weight", { precision: 5, scale: 2 }).notNull(),
  activity_level: activityLevelEnum("activity_level").notNull(),
  goal: goalEnum("goal").notNull(),
  meal_per_day: integer("meal_per_day"),
  cooking_time_pref: timePrefEnum("time_pref"),
  meal_prep: boolean("meal_prep").default(false),
  meal_prep_days: integer("meal_prep_days"),
  diet_preferences: dietEnum("diet").default("none"),
  budget_preference: budgetEnum("budget").default("medium"),
  likes: text("likes"),
  dislikes: text("dislikes"),
  allergies: text("allergies"),
  profileSnapshot: jsonb("profile_snapshot"), // Complete user profile in JSON format
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Updated shopping lists table for PDF files
export const shoppingLists = pgTable("shopping_lists", {
  id: uuid("id").primaryKey().defaultRandom(),
  userProfileId: uuid("userProfileId")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  weekStartDate: timestamp("weekStartDate").notNull(),
  weekEndDate: timestamp("weekEndDate").notNull(),
  markdownContent: text("markdownContent").notNull(),
  status: shoppingListStatusEnum("status").default("active").notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Optional: Track downloads for analytics
export const shoppingListDownloads = pgTable("shopping_list_downloads", {
  id: uuid("id").primaryKey().defaultRandom(),
  shoppingListId: uuid("shoppingListId")
    .notNull()
    .references(() => shoppingLists.id, { onDelete: "cascade" }),
  userProfileId: uuid("userProfileId")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  downloadedAt: timestamp("downloadedAt", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const mealPlans = pgTable("meal_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userProfileId: uuid("userProfileId")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  shoppingListId: uuid("shoppingListId")
    .notNull()
    .references(() => shoppingLists.id, { onDelete: "cascade" }),
  weekStartDate: timestamp("weekStartDate").notNull(),
  weekEndDate: timestamp("weekEndDate").notNull(),
  meals: jsonb("meals").notNull(), // Store meal plan as JSON
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Shopping List Templates - for admin to create reusable templates
export const shoppingListTemplates = pgTable("shopping_list_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  goal: goalEnum("goal").notNull(),
  diet: dietEnum("diet").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  markdownContent: text("markdownContent").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Meal Plan Templates - paired with shopping list templates
export const mealPlanTemplates = pgTable("meal_plan_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  shoppingListTemplateId: uuid("shopping_list_template_id")
    .notNull()
    .references(() => shoppingListTemplates.id, { onDelete: "cascade" }),
  goal: goalEnum("goal").notNull(),
  diet: dietEnum("diet").notNull(),
  meals: jsonb("meals").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Template Assignments - track which templates were assigned to users
export const templateAssignments = pgTable("template_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userProfileId: uuid("user_profile_id")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  shoppingListTemplateId: uuid("shopping_list_template_id")
    .notNull()
    .references(() => shoppingListTemplates.id),
  mealPlanTemplateId: uuid("meal_plan_template_id").references(
    () => mealPlanTemplates.id,
  ),
  shoppingListId: uuid("shopping_list_id").references(() => shoppingLists.id, {
    onDelete: "cascade",
  }),
  mealPlanId: uuid("meal_plan_id").references(() => mealPlans.id, {
    onDelete: "cascade",
  }),
  goal: goalEnum("goal").notNull(),
  diet: dietEnum("diet").notNull(),
  assigned_at: timestamp("assigned_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// NextAuth required tables
export const accounts = pgTable(
  "account",
  {
    userId: uuid("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  }),
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

// New table for AI-generated insights
export const aiInsights = pgTable("ai_insights", {
  id: uuid("id").primaryKey().defaultRandom(),
  userProfileId: uuid("user_profile_id")
    .references(() => userProfiles.id)
    .notNull(),
  insightType: text("insight_type").notNull(), // 'meal_plan', 'nutrition_analysis', 'recommendations'
  title: text("title").notNull(),
  content: jsonb("content").notNull(), // Store AI-generated JSON here
  metadata: jsonb("metadata"), // Additional data (calories, preferences, etc.)
  isActive: boolean("is_active").default(true),
  generatedAt: timestamp("generated_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // For cache-like behavior
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Feedback table
export const feedbackTypeEnum = pgEnum("feedback_type", [
  "bug",
  "feature",
  "improvement",
]);

export const feedback = pgTable("feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  userProfileId: uuid("userProfileId").references(() => userProfiles.id, {
    onDelete: "set null",
  }),
  userEmail: text("userEmail").notNull(),
  userName: text("userName"),
  type: feedbackTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").default("new").notNull(), // new, in_progress, resolved
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Weight history tracking table
export const weightHistory = pgTable("weight_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userProfileId: uuid("userProfileId")
    .notNull()
    .references(() => userProfiles.id, { onDelete: "cascade" }),
  weight: numeric("weight", { precision: 5, scale: 2 }).notNull(), // e.g., 75.50 kg
  recordedAt: timestamp("recorded_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  note: text("note"), // Optional note (e.g., "after workout", "morning weight")
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Push subscriptions table for PWA notifications
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  subscription: jsonb("subscription").notNull(), // PushSubscription object
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Stripe subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripePriceId: text("stripe_price_id"),
  status: subscriptionStatusEnum("status").notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  cancelAt: timestamp("cancel_at", { withTimezone: true }), // Stripe's cancel_at timestamp
  giftedBy: uuid("gifted_by").references(() => users.id),
  giftReason: text("gift_reason"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Invoice status enum
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "open",
  "paid",
  "void",
  "uncollectible",
]);

// Stripe invoices table for payment history
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeInvoiceId: text("stripe_invoice_id").unique().notNull(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: invoiceStatusEnum("status").notNull(),
  amountDue: integer("amount_due").notNull(), // in cents
  amountPaid: integer("amount_paid").notNull(), // in cents
  currency: text("currency").default("eur").notNull(),
  invoiceUrl: text("invoice_url"), // hosted invoice URL
  invoicePdf: text("invoice_pdf"), // PDF download URL
  periodStart: timestamp("period_start", { withTimezone: true }),
  periodEnd: timestamp("period_end", { withTimezone: true }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// GDPR Consent Logs for audit trail
export const consentLogs = pgTable("consent_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: consentTypeEnum("type").notNull(),
  agreed: boolean("agreed").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  documentVersion: text("document_version").default("v1.0").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Analytics event types
export const analyticsEventTypeEnum = pgEnum("analytics_event_type", [
  "auth",
  "feature",
  "subscription",
  "page_view",
  "engagement",
]);

// Analytics Events for tracking user behavior
export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("userId").references(() => users.id, { onDelete: "set null" }),
  eventType: analyticsEventTypeEnum("event_type").notNull(),
  eventName: text("event_name").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
