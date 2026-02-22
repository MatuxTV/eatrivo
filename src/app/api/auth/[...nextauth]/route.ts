import { handlers } from "../../../../../auth"; // Referring to the auth.ts we just created
import type { NextRequest } from "next/server";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";

const { GET: AuthGET, POST: AuthPOST } = handlers;

export const GET = AuthGET;

export async function POST(req: NextRequest) {
  // Apply rate limit against credential stuffing/brute force on auth endpoints
  const identifier = getRateLimitIdentifier(req);
  const rateLimitResult = await checkRateLimit(identifier, "auth");

  if (!rateLimitResult.success && rateLimitResult.response) {
    return rateLimitResult.response;
  }

  return AuthPOST(req);
}
