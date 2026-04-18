import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { auth } from "../../../../../../auth";
import { db } from "@/index";
import { recipeBookmarks, recipes, userProfiles } from "@/db/schema";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";
import {
  handleApiError,
  notFoundError,
  unauthorizedError,
  validationError,
} from "@/lib/safeError";

const recipeIdParamsSchema = z.object({
  recipeId: z.string().uuid(),
});

async function resolveUserProfileId(userId: string) {
  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
    columns: { id: true },
  });

  return userProfile?.id ?? null;
}

async function ensureRecipeExists(recipeId: string) {
  const recipe = await db.query.recipes.findFirst({
    where: eq(recipes.id, recipeId),
    columns: { id: true },
  });

  return Boolean(recipe);
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ recipeId: string }> },
) {
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

    const parsedParams = recipeIdParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) {
      return validationError("Invalid recipe id", "recipeId");
    }

    const userProfileId = await resolveUserProfileId(session.user.id);
    if (!userProfileId) {
      return notFoundError("Profile");
    }

    const recipeExists = await ensureRecipeExists(parsedParams.data.recipeId);
    if (!recipeExists) {
      return notFoundError("Recipe");
    }

    const bookmark = await db.query.recipeBookmarks.findFirst({
      where: and(
        eq(recipeBookmarks.userProfileId, userProfileId),
        eq(recipeBookmarks.recipeId, parsedParams.data.recipeId),
      ),
      columns: { id: true, createdAt: true },
    });

    return NextResponse.json({
      success: true,
      bookmarked: Boolean(bookmark),
      bookmarkedAt: bookmark?.createdAt ?? null,
    });
  } catch (error) {
    return handleApiError(error, "GET /api/recipes/[recipeId]/bookmark");
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ recipeId: string }> },
) {
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

    const parsedParams = recipeIdParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) {
      return validationError("Invalid recipe id", "recipeId");
    }

    const userProfileId = await resolveUserProfileId(session.user.id);
    if (!userProfileId) {
      return notFoundError("Profile");
    }

    const recipeExists = await ensureRecipeExists(parsedParams.data.recipeId);
    if (!recipeExists) {
      return notFoundError("Recipe");
    }

    const inserted = await db
      .insert(recipeBookmarks)
      .values({
        userProfileId,
        recipeId: parsedParams.data.recipeId,
      })
      .onConflictDoNothing({
        target: [recipeBookmarks.userProfileId, recipeBookmarks.recipeId],
      })
      .returning({ id: recipeBookmarks.id, createdAt: recipeBookmarks.createdAt });

    return NextResponse.json({
      success: true,
      bookmarked: true,
      alreadyBookmarked: inserted.length === 0,
      bookmarkedAt: inserted[0]?.createdAt ?? null,
    });
  } catch (error) {
    return handleApiError(error, "POST /api/recipes/[recipeId]/bookmark");
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ recipeId: string }> },
) {
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

    const parsedParams = recipeIdParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) {
      return validationError("Invalid recipe id", "recipeId");
    }

    const userProfileId = await resolveUserProfileId(session.user.id);
    if (!userProfileId) {
      return notFoundError("Profile");
    }

    const deleted = await db
      .delete(recipeBookmarks)
      .where(
        and(
          eq(recipeBookmarks.userProfileId, userProfileId),
          eq(recipeBookmarks.recipeId, parsedParams.data.recipeId),
        ),
      )
      .returning({ id: recipeBookmarks.id });

    return NextResponse.json({
      success: true,
      bookmarked: false,
      removed: deleted.length > 0,
    });
  } catch (error) {
    return handleApiError(error, "DELETE /api/recipes/[recipeId]/bookmark");
  }
}
