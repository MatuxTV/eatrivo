import { and, asc, count, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/index";
import { chatMessages, chatSessions } from "@/db/schema";

export interface ChatSessionSummary {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  messageCount: number;
  lastMessagePreview: string | null;
}

export interface ChatHistoryMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export function buildChatSessionTitle(content: string): string {
  return content
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export async function listOwnedChatSessions(
  userProfileId: string,
): Promise<ChatSessionSummary[]> {
  const rows = await db
    .select({
      id: chatSessions.id,
      title: chatSessions.title,
      createdAt: chatSessions.createdAt,
      updatedAt: chatSessions.updatedAt,
      lastMessageAt: chatSessions.lastMessageAt,
      messageCount: count(chatMessages.id).as("messageCount"),
      lastMessagePreview: sql<string | null>`(
        SELECT ${chatMessages.content}
        FROM ${chatMessages}
        WHERE ${chatMessages.sessionId} = ${chatSessions.id}
        ORDER BY ${chatMessages.createdAt} DESC
        LIMIT 1
      )`.as("lastMessagePreview"),
    })
    .from(chatSessions)
    .leftJoin(chatMessages, eq(chatMessages.sessionId, chatSessions.id))
    .where(
      and(
        eq(chatSessions.userProfileId, userProfileId),
        isNull(chatSessions.archivedAt),
      ),
    )
    .groupBy(
      chatSessions.id,
      chatSessions.title,
      chatSessions.createdAt,
      chatSessions.updatedAt,
      chatSessions.lastMessageAt,
    )
    .orderBy(desc(chatSessions.lastMessageAt), desc(chatSessions.createdAt));

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastMessageAt: row.lastMessageAt.toISOString(),
    messageCount: row.messageCount,
    lastMessagePreview: row.lastMessagePreview,
  }));
}

export async function getOwnedChatMessages(
  sessionId: string,
  userProfileId: string,
): Promise<ChatHistoryMessage[]> {
  const rows = await db
    .select({
      id: chatMessages.id,
      role: chatMessages.role,
      content: chatMessages.content,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
    .where(
      and(
        eq(chatMessages.sessionId, sessionId),
        eq(chatSessions.userProfileId, userProfileId),
        isNull(chatSessions.archivedAt),
      ),
    )
    .orderBy(asc(chatMessages.createdAt));

  return rows.map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getRecentOwnedChatMessages(
  sessionId: string,
  userProfileId: string,
  limit: number,
): Promise<ChatHistoryMessage[]> {
  const rows = await db
    .select({
      id: chatMessages.id,
      role: chatMessages.role,
      content: chatMessages.content,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .innerJoin(chatSessions, eq(chatMessages.sessionId, chatSessions.id))
    .where(
      and(
        eq(chatMessages.sessionId, sessionId),
        eq(chatSessions.userProfileId, userProfileId),
        isNull(chatSessions.archivedAt),
      ),
    )
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);

  return rows
    .reverse()
    .map((row) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
    }));
}