import { createHash, randomUUID } from "crypto";

import { apiLogger } from "@/lib/logger";
import { redis } from "@/lib/redis";

const PUSH_OPT_IN_TTL_SECONDS = 60 * 60 * 24;

export type PushOptInLocale = "sk" | "en";

export type PendingPushOptIn = {
  userId: string;
  userEmail: string;
  userName: string | null;
  subscription: unknown;
  endpoint: string;
  userAgent: string | null;
  ipAddress: string;
  locale: PushOptInLocale;
  createdAt: string;
};

function tokenKey(token: string) {
  return `push-optin:token:${token}`;
}

function endpointKey(userId: string, endpoint: string) {
  const hash = createHash("sha256").update(`${userId}:${endpoint}`).digest("hex");
  return `push-optin:endpoint:${hash}`;
}

export function normalizePushOptInLocale(locale?: string): PushOptInLocale {
  return locale === "en" ? "en" : "sk";
}

export async function createOrReusePendingPushOptIn(
  payload: PendingPushOptIn,
): Promise<{ token: string; isNew: boolean }> {
  const existingToken = await redis.get<string>(endpointKey(payload.userId, payload.endpoint));

  if (typeof existingToken === "string") {
    const existingPayload = await getPendingPushOptIn(existingToken);
    if (existingPayload) {
      return { token: existingToken, isNew: false };
    }
  }

  const token = randomUUID();
  await redis.setex(tokenKey(token), PUSH_OPT_IN_TTL_SECONDS, JSON.stringify(payload));
  await redis.set(endpointKey(payload.userId, payload.endpoint), token, {
    ex: PUSH_OPT_IN_TTL_SECONDS,
  });

  apiLogger.info("Created pending push opt-in token", {
    metadata: {
      userId: payload.userId,
      endpoint: payload.endpoint.slice(0, 60),
      token,
    },
  });

  return { token, isNew: true };
}

export async function getPendingPushOptIn(token: string): Promise<PendingPushOptIn | null> {
  const raw = await redis.get(tokenKey(token));
  if (!raw) {
    return null;
  }

  try {
    return typeof raw === "string"
      ? (JSON.parse(raw) as PendingPushOptIn)
      : (raw as PendingPushOptIn);
  } catch (error) {
    apiLogger.error("Failed to parse pending push opt-in payload", error, {
      metadata: { token },
    });
    return null;
  }
}

export async function clearPendingPushOptIn(token: string, payload: PendingPushOptIn): Promise<void> {
  await redis.del(tokenKey(token));
  await redis.del(endpointKey(payload.userId, payload.endpoint));
}
