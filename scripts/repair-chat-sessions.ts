import "dotenv/config";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";

import { db } from "../src/index";

type ExistenceRow = {
  tableName: string | null;
};

type MissingRowCount = {
  count: number;
};

type ConflictRow = {
  sessionId: string;
};

type SessionAggregateRow = {
  sessionId: string;
  userProfileId: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
};

async function getMissingRowCount(): Promise<number> {
  const result = await db.execute(sql<MissingRowCount>`
    SELECT COUNT(*)::int AS count
    FROM chat_messages cm
    LEFT JOIN chat_sessions cs ON cs.id = cm.session_id
    WHERE cs.id IS NULL
  `);

  const countValue = result.rows[0]?.count;
  return typeof countValue === "number" ? countValue : 0;
}

async function ensureChatSessionsTable() {
  const result = await db.execute(sql<ExistenceRow>`
    SELECT to_regclass('public.chat_sessions') AS "tableName"
  `);

  if (!result.rows[0]?.tableName) {
    throw new Error(
      "Table public.chat_sessions does not exist yet. Run drizzle-kit push first so the table is created, then run this repair script.",
    );
  }
}

async function getConflictingSessionIds(): Promise<string[]> {
  const result = await db.execute(sql<ConflictRow>`
    SELECT cm.session_id AS "sessionId"
    FROM chat_messages cm
    GROUP BY cm.session_id
    HAVING COUNT(DISTINCT cm.user_profile_id) > 1
  `);

  return result.rows
    .map((row) => row.sessionId)
    .filter((sessionId): sessionId is string => typeof sessionId === "string");
}

async function getSessionAggregates(sessionId: string): Promise<SessionAggregateRow[]> {
  const result = await db.execute(sql<SessionAggregateRow>`
    SELECT
      cm.session_id AS "sessionId",
      cm.user_profile_id AS "userProfileId",
      MIN(cm.created_at) AS "createdAt",
      MAX(cm.created_at) AS "updatedAt",
      MAX(cm.created_at) AS "lastMessageAt"
    FROM chat_messages cm
    WHERE cm.session_id = ${sessionId}
    GROUP BY cm.session_id, cm.user_profile_id
    ORDER BY MIN(cm.created_at) ASC
  `);

  return result.rows
    .map((row) => {
      const sessionIdValue = row.sessionId;
      const userProfileIdValue = row.userProfileId;
      const createdAtValue = row.createdAt;
      const updatedAtValue = row.updatedAt;
      const lastMessageAtValue = row.lastMessageAt;

      if (
        typeof sessionIdValue !== "string" ||
        typeof userProfileIdValue !== "string" ||
        !(createdAtValue instanceof Date) ||
        !(updatedAtValue instanceof Date) ||
        !(lastMessageAtValue instanceof Date)
      ) {
        return null;
      }

      return {
        sessionId: sessionIdValue,
        userProfileId: userProfileIdValue,
        createdAt: createdAtValue,
        updatedAt: updatedAtValue,
        lastMessageAt: lastMessageAtValue,
      } satisfies SessionAggregateRow;
    })
    .filter((row): row is SessionAggregateRow => row !== null);
}

async function getExistingOwner(sessionId: string) {
  const result = await db.execute<{ userProfileId: string }>(sql`
    SELECT user_profile_id AS "userProfileId"
    FROM chat_sessions
    WHERE id = ${sessionId}
    LIMIT 1
  `);

  return result.rows[0]?.userProfileId ?? null;
}

async function upsertChatSession(aggregate: SessionAggregateRow) {
  await db.execute(sql`
    INSERT INTO chat_sessions (
      id,
      user_profile_id,
      title,
      created_at,
      updated_at,
      last_message_at,
      archived_at
    )
    VALUES (
      ${aggregate.sessionId},
      ${aggregate.userProfileId},
      NULL,
      ${aggregate.createdAt},
      ${aggregate.updatedAt},
      ${aggregate.lastMessageAt},
      NULL
    )
    ON CONFLICT (id) DO UPDATE
    SET
      user_profile_id = EXCLUDED.user_profile_id,
      created_at = LEAST(chat_sessions.created_at, EXCLUDED.created_at),
      updated_at = GREATEST(chat_sessions.updated_at, EXCLUDED.updated_at),
      last_message_at = GREATEST(chat_sessions.last_message_at, EXCLUDED.last_message_at)
  `);
}

async function splitConflictingSessions() {
  const conflictingSessionIds = await getConflictingSessionIds();

  if (conflictingSessionIds.length === 0) {
    return 0;
  }

  let reassignedProfiles = 0;

  for (const sessionId of conflictingSessionIds) {
    const aggregates = await getSessionAggregates(sessionId);
    if (aggregates.length <= 1) {
      continue;
    }

    const existingOwner = await getExistingOwner(sessionId);
    const primaryAggregate =
      aggregates.find((aggregate) => aggregate.userProfileId === existingOwner) ??
      aggregates[0];

    if (!primaryAggregate) {
      continue;
    }

    await upsertChatSession(primaryAggregate);

    for (const aggregate of aggregates) {
      if (aggregate.userProfileId === primaryAggregate.userProfileId) {
        continue;
      }

      const newSessionId = randomUUID();

      await db.execute(sql`
        UPDATE chat_messages
        SET session_id = ${newSessionId}
        WHERE session_id = ${sessionId}
          AND user_profile_id = ${aggregate.userProfileId}
      `);

      await upsertChatSession({
        ...aggregate,
        sessionId: newSessionId,
      });
      reassignedProfiles += 1;
    }
  }

  return reassignedProfiles;
}

async function backfillMissingSessions() {
  await db.execute(sql`
    INSERT INTO chat_sessions (
      id,
      user_profile_id,
      title,
      created_at,
      updated_at,
      last_message_at,
      archived_at
    )
    SELECT
      cm.session_id,
      cm.user_profile_id,
      NULL,
      MIN(cm.created_at) AS created_at,
      MAX(cm.created_at) AS updated_at,
      MAX(cm.created_at) AS last_message_at,
      NULL
    FROM chat_messages cm
    LEFT JOIN chat_sessions cs ON cs.id = cm.session_id
    WHERE cs.id IS NULL
    GROUP BY cm.session_id, cm.user_profile_id
    ON CONFLICT (id) DO NOTHING
  `);
}

async function syncSessionTimestamps() {
  await db.execute(sql`
    UPDATE chat_sessions cs
    SET
      created_at = agg.created_at,
      updated_at = agg.updated_at,
      last_message_at = agg.last_message_at
    FROM (
      SELECT
        cm.session_id,
        MIN(cm.created_at) AS created_at,
        MAX(cm.created_at) AS updated_at,
        MAX(cm.created_at) AS last_message_at
      FROM chat_messages cm
      GROUP BY cm.session_id
    ) agg
    WHERE cs.id = agg.session_id
  `);
}

async function main() {
  await ensureChatSessionsTable();

  const missingBefore = await getMissingRowCount();
  const reassignedProfiles = await splitConflictingSessions();

  await backfillMissingSessions();
  await syncSessionTimestamps();

  const missingAfter = await getMissingRowCount();

  console.log(
    JSON.stringify(
      {
        missingBefore,
        reassignedProfiles,
        missingAfter,
      },
      null,
      2,
    ),
  );

  if (missingAfter > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});