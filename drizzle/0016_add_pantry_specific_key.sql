ALTER TABLE "pantry_items"
ADD COLUMN "ingredient_specific_key" text;

CREATE INDEX IF NOT EXISTS "pantry_items_ingredient_specific_key_idx"
ON "pantry_items" ("ingredient_specific_key");