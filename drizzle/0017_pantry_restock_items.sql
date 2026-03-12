CREATE TABLE "pantry_restock_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userProfileId" uuid NOT NULL,
  "name" text NOT NULL,
  "ingredient_name" text,
  "ingredient_key" text,
  "ingredient_specific_key" text,
  "default_quantity" numeric(8, 3),
  "default_unit" text,
  "category" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "last_restocked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "pantry_restock_items"
ADD CONSTRAINT "pantry_restock_items_userProfileId_user_profiles_id_fk"
FOREIGN KEY ("userProfileId") REFERENCES "public"."user_profiles"("id")
ON DELETE cascade ON UPDATE no action;

CREATE INDEX "pantry_restock_items_user_profile_idx"
ON "pantry_restock_items" ("userProfileId");

CREATE INDEX "pantry_restock_items_specific_key_idx"
ON "pantry_restock_items" ("ingredient_specific_key");

CREATE INDEX "pantry_restock_items_key_idx"
ON "pantry_restock_items" ("ingredient_key");