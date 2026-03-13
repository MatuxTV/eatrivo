ALTER TABLE "shopping_lists" DROP COLUMN "markdownContent";

CREATE TABLE "shopping_list_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "shoppingListId" uuid NOT NULL,
  "sort_order" integer NOT NULL,
  "name" text NOT NULL,
  "ingredient_name" text,
  "ingredient_key" text,
  "ingredient_specific_key" text,
  "quantity" numeric(8, 3),
  "unit" text,
  "amount_label" text,
  "category" text,
  "is_checked" boolean DEFAULT false NOT NULL,
  "checked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "shopping_list_items"
ADD CONSTRAINT "shopping_list_items_shoppingListId_shopping_lists_id_fk"
FOREIGN KEY ("shoppingListId") REFERENCES "public"."shopping_lists"("id")
ON DELETE cascade ON UPDATE no action;

CREATE INDEX "shopping_list_items_list_idx"
ON "shopping_list_items" ("shoppingListId");

CREATE INDEX "shopping_list_items_list_order_idx"
ON "shopping_list_items" ("shoppingListId", "sort_order");

CREATE INDEX "shopping_list_items_ingredient_key_idx"
ON "shopping_list_items" ("ingredient_key");

CREATE UNIQUE INDEX "shopping_lists_one_active_per_user_idx"
ON "shopping_lists" ("userProfileId")
WHERE "status" = 'active';