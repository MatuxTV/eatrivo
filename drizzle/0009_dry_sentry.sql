CREATE TYPE "public"."pantry_item_source" AS ENUM('manual', 'shopping_list');--> statement-breakpoint
ALTER TYPE "public"."consent_type" ADD VALUE 'push_notifications';--> statement-breakpoint
ALTER TYPE "public"."shopping_list_status" ADD VALUE 'draft' BEFORE 'active';--> statement-breakpoint
ALTER TYPE "public"."shopping_list_status" ADD VALUE 'approved' BEFORE 'completed';--> statement-breakpoint
ALTER TYPE "public"."shopping_list_status" ADD VALUE 'purchased' BEFORE 'completed';--> statement-breakpoint
CREATE TABLE "pantry_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userProfileId" uuid NOT NULL,
	"name" text NOT NULL,
	"quantity" numeric(8, 3),
	"unit" text,
	"category" text,
	"expiry_date" timestamp with time zone,
	"source" "pantry_item_source" DEFAULT 'manual' NOT NULL,
	"shopping_list_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pantry_items" ADD CONSTRAINT "pantry_items_userProfileId_user_profiles_id_fk" FOREIGN KEY ("userProfileId") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pantry_items" ADD CONSTRAINT "pantry_items_shopping_list_id_shopping_lists_id_fk" FOREIGN KEY ("shopping_list_id") REFERENCES "public"."shopping_lists"("id") ON DELETE set null ON UPDATE no action;