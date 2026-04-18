UPDATE "user_profiles"
SET "role" = 'admin'
WHERE "role" = 'coach';--> statement-breakpoint

ALTER TYPE "public"."role" RENAME TO "role_old";--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint

ALTER TABLE "user_profiles"
  ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint

ALTER TABLE "user_profiles"
  ALTER COLUMN "role" TYPE "public"."role"
  USING (
    CASE
      WHEN "role"::text = 'coach' THEN 'admin'
      ELSE "role"::text
    END
  )::"public"."role";--> statement-breakpoint

ALTER TABLE "user_profiles"
  ALTER COLUMN "role" SET DEFAULT 'user';--> statement-breakpoint

DROP TYPE "public"."role_old";