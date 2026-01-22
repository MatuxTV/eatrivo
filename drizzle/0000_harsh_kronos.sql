CREATE TYPE "public"."activity_level" AS ENUM('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'athlete');--> statement-breakpoint
CREATE TYPE "public"."budget" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."diet" AS ENUM('none', 'lactosefree', 'vegetarian', 'vegan', 'pescatarian', 'ketogenic', 'paleolithic');--> statement-breakpoint
CREATE TYPE "public"."feedback_type" AS ENUM('bug', 'feature', 'improvement');--> statement-breakpoint
CREATE TYPE "public"."goal" AS ENUM('lose_weight', 'maintain_weight', 'gain_muscle');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('sk', 'en');--> statement-breakpoint
CREATE TYPE "public"."membership" AS ENUM('basic', 'premium', 'trainer');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'coach', 'admin');--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('man', 'woman');--> statement-breakpoint
CREATE TYPE "public"."shopping_list_status" AS ENUM('active', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."time_pref" AS ENUM('quick', 'normal', 'slow');--> statement-breakpoint
CREATE TABLE "account" (
	"userId" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "ai_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_profile_id" uuid NOT NULL,
	"insight_type" text NOT NULL,
	"title" text NOT NULL,
	"content" jsonb NOT NULL,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true,
	"generated_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userProfileId" uuid,
	"userEmail" text NOT NULL,
	"userName" text,
	"type" "feedback_type" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "food_items" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"unit" text,
	"kcal_per_unit" integer,
	"protein" numeric,
	"carbs" numeric,
	"fat" numeric
);
--> statement-breakpoint
CREATE TABLE "meal_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userProfileId" uuid NOT NULL,
	"shoppingListId" uuid NOT NULL,
	"weekStartDate" timestamp NOT NULL,
	"weekEndDate" timestamp NOT NULL,
	"meals" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"subscription" jsonb NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" uuid NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopping_list_downloads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shoppingListId" uuid NOT NULL,
	"userProfileId" uuid NOT NULL,
	"downloadedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopping_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userProfileId" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"weekStartDate" timestamp NOT NULL,
	"weekEndDate" timestamp NOT NULL,
	"markdownContent" text NOT NULL,
	"status" "shopping_list_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_info" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userProfileId" uuid NOT NULL,
	"sex" "sex" NOT NULL,
	"language" "language" DEFAULT 'sk' NOT NULL,
	"dateOfBirth" timestamp,
	"height" integer NOT NULL,
	"weight" numeric(5, 2) NOT NULL,
	"activity_level" "activity_level" NOT NULL,
	"goal" "goal" NOT NULL,
	"meal_per_day" integer,
	"time_pref" time_pref,
	"diet" "diet" DEFAULT 'none',
	"budget" "budget" DEFAULT 'medium',
	"likes" text,
	"dislikes" text,
	"allergies" text,
	"profile_snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"fullName" text NOT NULL,
	"role" "role" DEFAULT 'user' NOT NULL,
	"dateOfBirth" timestamp,
	"isProfileComplete" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"emailVerified" timestamp,
	"membership" "membership" DEFAULT 'premium' NOT NULL,
	"image" text,
	"last_seen_welcome_version" text,
	"last_seen_welcome_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "weight_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userProfileId" uuid NOT NULL,
	"weight" numeric(5, 2) NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_user_profile_id_user_profiles_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_userProfileId_user_profiles_id_fk" FOREIGN KEY ("userProfileId") REFERENCES "public"."user_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_userProfileId_user_profiles_id_fk" FOREIGN KEY ("userProfileId") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_shoppingListId_shopping_lists_id_fk" FOREIGN KEY ("shoppingListId") REFERENCES "public"."shopping_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_list_downloads" ADD CONSTRAINT "shopping_list_downloads_shoppingListId_shopping_lists_id_fk" FOREIGN KEY ("shoppingListId") REFERENCES "public"."shopping_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_list_downloads" ADD CONSTRAINT "shopping_list_downloads_userProfileId_user_profiles_id_fk" FOREIGN KEY ("userProfileId") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_userProfileId_user_profiles_id_fk" FOREIGN KEY ("userProfileId") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_info" ADD CONSTRAINT "user_info_userProfileId_user_profiles_id_fk" FOREIGN KEY ("userProfileId") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weight_history" ADD CONSTRAINT "weight_history_userProfileId_user_profiles_id_fk" FOREIGN KEY ("userProfileId") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;