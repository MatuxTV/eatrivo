CREATE TYPE "public"."tutorial_status" AS ENUM('unseen', 'started', 'completed', 'dismissed', 'skipped');--> statement-breakpoint
CREATE TABLE "user_tutorial_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tutorial_key" text NOT NULL,
	"surface_key" text NOT NULL,
	"version" text NOT NULL,
	"status" "tutorial_status" DEFAULT 'unseen' NOT NULL,
	"last_step_index" integer DEFAULT 0 NOT NULL,
	"first_seen_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"dismissed_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_tutorial_state_user_surface_unique" UNIQUE("user_id","tutorial_key","surface_key")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_tutorial_state" ADD CONSTRAINT "user_tutorial_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_tutorial_state_user_idx" ON "user_tutorial_state" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_tutorial_state_status_idx" ON "user_tutorial_state" USING btree ("status");