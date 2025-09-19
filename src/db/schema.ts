import { pgTable, uuid, text, pgEnum, timestamp, integer, numeric, primaryKey, boolean } from "drizzle-orm/pg-core";

// Define the role enum
export const roleEnum = pgEnum("role", ["user","coach", "admin"]);
export const sexEnum = pgEnum("sex",["man","women"]);
export const activityLevelEnum = pgEnum("activity_level",["sedentary","lightly_active","moderately_active","very_active","athlete"]);
export const dietEnum = pgEnum("diet",["none","lactosefree","vegetarian","vegan","pescatarian","ketogenic","paleolithic"]);
export const timePrefEnum = pgEnum("time_pref",["quick","normal","slow"]);
export const budgetEnum = pgEnum("budget",["low","medium","high"]);

// NextAuth users table (minimal, just for OAuth)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

// Your app's main user profile table
export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  fullName: text("fullName").notNull(),
  username: text("username").unique(),
  phone: text("phone"),
  dateOfBirth: timestamp("dateOfBirth"),
  role: roleEnum("role").default("user").notNull(),
  isProfileComplete: boolean("isProfileComplete").default(false).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Extended user info for food preferences
export const userInfoTable = pgTable("user_info", {
  id: uuid("id").primaryKey().defaultRandom(),
  userProfileId: uuid("userProfileId").notNull().references(() => userProfiles.id, { onDelete: "cascade" }),
  sex: sexEnum("sex").notNull(),
  age: integer("age").notNull(),
  height: integer("height").notNull(),
  weight: numeric("weight", { precision: 5, scale: 2 }).notNull(),
  activity_level: activityLevelEnum("activity_level").notNull(),
  meal_per_day: integer("meal_per_day"),
  cooking_time_pref: timePrefEnum("time_pref"),
  diet_preferences: dietEnum("diet").default("none"),
  budget_preference: budgetEnum("budget").default("medium"),
  likes: text("likes"),
  dislikes: text("dislikes"),
  allergies: text("allergies"),
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