CREATE TABLE "chat_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_profile_id" uuid NOT NULL,
	"title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_profile_id_user_profiles_id_fk" FOREIGN KEY ("user_profile_id") REFERENCES "public"."user_profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "chat_sessions" ("id", "user_profile_id", "created_at", "updated_at", "last_message_at")
SELECT
	"session_id",
	"user_profile_id",
	MIN("created_at") AS "created_at",
	MAX("created_at") AS "updated_at",
	MAX("created_at") AS "last_message_at"
FROM "chat_messages"
GROUP BY "session_id", "user_profile_id"
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
CREATE INDEX "chat_sessions_user_profile_idx" ON "chat_sessions" USING btree ("user_profile_id");
--> statement-breakpoint
CREATE INDEX "chat_sessions_last_message_idx" ON "chat_sessions" USING btree ("last_message_at");
--> statement-breakpoint
CREATE INDEX "chat_messages_session_created_idx" ON "chat_messages" USING btree ("session_id", "created_at");
--> statement-breakpoint
CREATE INDEX "chat_messages_user_profile_created_idx" ON "chat_messages" USING btree ("user_profile_id", "created_at");
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE cascade ON UPDATE no action;