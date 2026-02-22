CREATE TYPE "public"."badge_type" AS ENUM('legacy');--> statement-breakpoint
CREATE TABLE "badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userProfileId" uuid NOT NULL,
	"type" "badge_type" NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "badges" ADD CONSTRAINT "badges_userProfileId_user_profiles_id_fk" FOREIGN KEY ("userProfileId") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;