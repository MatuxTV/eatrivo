import { pgTable, uuid, text, pgEnum, timestamp, integer,jsonb, numeric, primaryKey, boolean } from "drizzle-orm/pg-core";

// Define the role enum
export const roleEnum = pgEnum("role", ["user","coach", "admin"]);
export const sexEnum = pgEnum("sex",["man","woman"]);
export const activityLevelEnum = pgEnum("activity_level",["sedentary","lightly_active","moderately_active","very_active","athlete"]);
export const dietEnum = pgEnum("diet",["none","lactosefree","vegetarian","vegan","pescatarian","ketogenic","paleolithic"]);
export const timePrefEnum = pgEnum("time_pref",["quick","normal","slow"]);
export const budgetEnum = pgEnum("budget",["low","medium","high"]);
export const membershipEnum = pgEnum("membership", ["basic", "premium", "trainer"]);
export const shoppingListStatusEnum = pgEnum("shopping_list_status", ["active", "completed", "cancelled"]);
export const goalEnum = pgEnum("goal", ["lose_weight", "maintain_weight", "gain_muscle"]);
export const languageEnum = pgEnum("language",["sk","en"]);

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
  membership: membershipEnum("membership").default("premium").notNull(),
  image: text("image"),
  //Stamp for NewUpdate window tracking
  lastSeenWelcomeVersion: text("last_seen_welcome_version"),
  lastSeenWelcomeAt: timestamp("last_seen_welcome_at", { withTimezone: true }),
});

// Your app's main user profile table
export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  fullName: text("fullName").notNull(),
  // username: text("username").unique(),
  role: roleEnum("role").default("user").notNull(),
  dateOfBirth: timestamp("dateOfBirth"),
  isProfileComplete: boolean("isProfileComplete").default(false).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Extended user info for food preferences
export const userInfoTable = pgTable("user_info", {
  id: uuid("id").primaryKey().defaultRandom(),
  userProfileId: uuid("userProfileId").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  sex: sexEnum("sex").notNull(),
  language: languageEnum("language").default("sk").notNull(),
  dateOfBirth: timestamp("dateOfBirth"),
  height: integer("height").notNull(),
  weight: numeric("weight", { precision: 5, scale: 2 }).notNull(),
  activity_level: activityLevelEnum("activity_level").notNull(),
  goal: goalEnum("goal").notNull(),
  meal_per_day: integer("meal_per_day"),
  cooking_time_pref: timePrefEnum("time_pref"),
  diet_preferences: dietEnum("diet").default("none"),
  budget_preference: budgetEnum("budget").default("medium"),
  likes: text("likes"),
  dislikes: text("dislikes"),
  allergies: text("allergies"),
  profileSnapshot: jsonb("profile_snapshot"), // Complete user profile in JSON format
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Updated shopping lists table for PDF files
export const shoppingLists = pgTable("shopping_lists", {
  id: uuid("id").primaryKey().defaultRandom(),
  userProfileId: uuid("userProfileId").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  weekStartDate: timestamp("weekStartDate").notNull(),
  weekEndDate: timestamp("weekEndDate").notNull(),
  markdownContent : text("markdownContent").notNull(),
  status: shoppingListStatusEnum("status").default("active").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Optional: Track downloads for analytics
export const shoppingListDownloads = pgTable("shopping_list_downloads", {
  id: uuid("id").primaryKey().defaultRandom(),
  shoppingListId: uuid("shoppingListId").notNull().references(() => shoppingLists.id, { onDelete: "cascade" }),
  userProfileId: uuid("userProfileId").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  downloadedAt: timestamp("downloadedAt", { withTimezone: true }).defaultNow().notNull(),
});

export const mealPlans = pgTable("meal_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  userProfileId: uuid("userProfileId").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  shoppingListId: uuid("shoppingListId").notNull().references(() => shoppingLists.id, { onDelete: "cascade" }),
  weekStartDate: timestamp("weekStartDate").notNull(),
  weekEndDate: timestamp("weekEndDate").notNull(),
  meals: jsonb("meals").notNull(), // Store meal plan as JSON
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// NextAuth required tables
export const accounts = pgTable("account", {
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
}, (account) => ({
  compoundKey: primaryKey({
    columns: [account.provider, account.providerAccountId],
  }),
}));

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verificationToken", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (vt) => ({
  compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
}));

// New table for AI-generated insights
export const aiInsights = pgTable('ai_insights', {
  id: uuid('id').primaryKey().defaultRandom(),
  userProfileId: uuid('user_profile_id').references(() => userProfiles.id).notNull(),
  insightType: text('insight_type').notNull(), // 'meal_plan', 'nutrition_analysis', 'recommendations'
  title: text('title').notNull(),
  content: jsonb('content').notNull(), // Store AI-generated JSON here
  metadata: jsonb('metadata'), // Additional data (calories, preferences, etc.)
  isActive: boolean('is_active').default(true),
  generatedAt: timestamp('generated_at').defaultNow(),
  expiresAt: timestamp('expires_at'), // For cache-like behavior
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
})

// Feedback table
export const feedbackTypeEnum = pgEnum("feedback_type", ["bug", "feature", "improvement"]);

export const feedback = pgTable("feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  userProfileId: uuid("userProfileId").references(() => userProfiles.id, { onDelete: "set null" }),
  userEmail: text("userEmail").notNull(),
  userName: text("userName"),
  type: feedbackTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: text("status").default("new").notNull(), // new, in_progress, resolved
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

// Weight history tracking table
export const weightHistory = pgTable("weight_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userProfileId: uuid("userProfileId").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  weight: numeric("weight", { precision: 5, scale: 2 }).notNull(), // e.g., 75.50 kg
  recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
  note: text("note"), // Optional note (e.g., "after workout", "morning weight")
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})