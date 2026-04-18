CREATE TABLE "recipe_bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_profile_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipe_bookmarks_user_recipe_unique" UNIQUE("user_profile_id","recipe_id")
);
--> statement-breakpoint
ALTER TABLE "recipe_bookmarks" ADD CONSTRAINT "recipe_bookmarks_user_profile_id_user_profiles_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_bookmarks" ADD CONSTRAINT "recipe_bookmarks_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recipe_bookmarks_user_profile_idx" ON "recipe_bookmarks" USING btree ("user_profile_id");--> statement-breakpoint
CREATE INDEX "recipe_bookmarks_recipe_idx" ON "recipe_bookmarks" USING btree ("recipe_id");