import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { auth } from "../../../../../auth";
import { db } from "@/index";
import { userInfoTable, userProfiles } from "@/db/schema";
import {
  getRecipeBrowseAvailableFilters,
  getRecipeBrowsePage,
} from "@/lib/recipes/browse";
import { normalizeRecipeLocale } from "@/lib/recipes/recipe-localization";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";
import {
  handleApiError,
  unauthorizedError,
  validationError,
} from "@/lib/safeError";

const querySchema = z.object({
  locale: z.string().trim().min(2).max(10).optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(24).default(8),
  quick: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});

function normalizeQueryList(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean))];
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const identifier = getRateLimitIdentifier(
      req as unknown as Request,
      session.user.id,
    );
    const rateLimitResult = await checkRateLimit(identifier, "standard");
    if (!rateLimitResult.success) {
      return (
        rateLimitResult.response ??
        NextResponse.json({ error: "Too many requests" }, { status: 429 })
      );
    }

    const parsedQuery = querySchema.safeParse({
      locale: req.nextUrl.searchParams.get("locale") ?? undefined,
      offset: req.nextUrl.searchParams.get("offset") ?? undefined,
      limit: req.nextUrl.searchParams.get("limit") ?? undefined,
      quick: req.nextUrl.searchParams.get("quick") ?? undefined,
    });

    if (!parsedQuery.success) {
      return validationError("Invalid recipe browse query", "query");
    }

    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, session.user.id),
      columns: { id: true },
    });

    const userInfo = userProfile
      ? await db.query.userInfoTable.findFirst({
          where: eq(userInfoTable.userProfileId, userProfile.id),
          columns: { language: true, diet_preferences: true },
        })
      : null;

    const locale = normalizeRecipeLocale(
      parsedQuery.data.locale ?? userInfo?.language ?? "en",
    );
    const categoryKeys = normalizeQueryList(req.nextUrl.searchParams.getAll("category"));
    const dietTags = normalizeQueryList(req.nextUrl.searchParams.getAll("tag"));

    const [page, availableFilters] = await Promise.all([
      getRecipeBrowsePage({
        locale,
        userProfileId: userProfile?.id ?? null,
        dietPreference: userInfo?.diet_preferences,
        filters: {
          categoryKeys,
          dietTags,
          quickOnly: parsedQuery.data.quick,
        },
        offset: parsedQuery.data.offset,
        limit: parsedQuery.data.limit,
      }),
      getRecipeBrowseAvailableFilters({
        dietPreference: userInfo?.diet_preferences,
      }),
    ]);

    return NextResponse.json({
      success: true,
      locale,
      page,
      availableFilters,
    });
  } catch (error) {
    return handleApiError(error, "GET /api/recipes/browse");
  }
}