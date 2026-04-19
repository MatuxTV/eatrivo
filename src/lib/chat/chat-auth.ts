import { and, desc, eq, isNull } from "drizzle-orm";

import { auth } from "../../../auth";
import { db } from "@/index";
import { chatSessions, userProfiles, users, type membershipEnum } from "@/db/schema";
import { unauthorizedError } from "@/lib/safeError";

type Membership = typeof membershipEnum.enumValues[number];

export interface AuthenticatedChatContext {
  userId: string;
  userProfileId: string;
  membership: Membership;
}

export async function getAuthenticatedChatContext(): Promise<
  { ok: true; context: AuthenticatedChatContext } | { ok: false; response: Response }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, response: unauthorizedError() };
  }

  const [currentUser] = await db
    .select({ membership: users.membership })
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!currentUser) {
    return {
      ok: false,
      response: Response.json({ error: "User not found" }, { status: 404 }),
    };
  }

  const [profile] = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.userId, session.user.id));

  if (!profile) {
    return {
      ok: false,
      response: Response.json({ error: "Profile not found" }, { status: 404 }),
    };
  }

  return {
    ok: true,
    context: {
      userId: session.user.id,
      userProfileId: profile.id,
      membership: currentUser.membership,
    },
  };
}

export async function getOwnedChatSession(
  sessionId: string,
  userProfileId: string,
) {
  return db.query.chatSessions.findFirst({
    where: and(
      eq(chatSessions.id, sessionId),
      eq(chatSessions.userProfileId, userProfileId),
      isNull(chatSessions.archivedAt),
    ),
  });
}

export async function getLatestOwnedChatSession(userProfileId: string) {
  return db.query.chatSessions.findFirst({
    where: and(
      eq(chatSessions.userProfileId, userProfileId),
      isNull(chatSessions.archivedAt),
    ),
    orderBy: [desc(chatSessions.lastMessageAt), desc(chatSessions.createdAt)],
  });
}