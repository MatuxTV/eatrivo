import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "../../../../../../../../auth";
import { customRecipeJobParamsSchema } from "@/lib/custom-recipes/contracts";
import { CustomRecipeGenerationStore } from "@/lib/custom-recipes/store";
import { apiLogger } from "@/lib/logger";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";

function jsonError(
  error: string,
  code: string,
  status: number,
  headers?: HeadersInit,
) {
  return NextResponse.json({ error, code }, { status, headers });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    apiLogger.warn("[customRecipe.result] unauthorized request");
    return jsonError("Unauthorized", "AUTH_REQUIRED", 401);
  }

  apiLogger.debug("[customRecipe.result] fetch received", {
    metadata: {
      userId: session.user.id,
    },
  });

  const rateLimitResult = await checkRateLimit(
    getRateLimitIdentifier(request as unknown as Request, session.user.id),
    "standard",
  );
  if (!rateLimitResult.success) {
    apiLogger.warn("[customRecipe.result] rate limit exceeded", {
      metadata: {
        userId: session.user.id,
      },
    });
    return jsonError(
      "Too many requests",
      "RATE_LIMITED",
      429,
      rateLimitResult.response?.headers,
    );
  }

  const parsedParams = customRecipeJobParamsSchema.safeParse(await params);
  if (!parsedParams.success) {
    apiLogger.warn("[customRecipe.result] invalid params", {
      metadata: {
        userId: session.user.id,
      },
    });
    return jsonError("Validation failed", "INVALID_INPUT", 400);
  }

  const [resultRecord, progressRecord] = await Promise.all([
    CustomRecipeGenerationStore.getResult(parsedParams.data.jobId),
    CustomRecipeGenerationStore.getProgress(parsedParams.data.jobId),
  ]);

  if (!resultRecord || resultRecord.userId !== session.user.id) {
    if (progressRecord?.userId === session.user.id && progressRecord.failed) {
      apiLogger.warn("[customRecipe.result] generation failed", {
        metadata: {
          userId: session.user.id,
          jobId: parsedParams.data.jobId,
          errorCode: progressRecord.errorCode ?? "GENERATION_FAILED",
        },
      });
      return jsonError(
        "Generation failed",
        progressRecord.errorCode ?? "GENERATION_FAILED",
        400,
      );
    }

    apiLogger.warn("[customRecipe.result] result not ready", {
      metadata: {
        userId: session.user.id,
        jobId: parsedParams.data.jobId,
      },
    });
    return jsonError("Not found", "GENERATION_RESULT_NOT_READY", 404);
  }

  await CustomRecipeGenerationStore.touchResult(parsedParams.data.jobId);

  apiLogger.info("[customRecipe.result] result returned", {
    metadata: {
      userId: session.user.id,
      jobId: resultRecord.jobId,
      fallbackUsed: resultRecord.result.meta.fallbackUsed,
      pantryRecipeStatus: resultRecord.result.pantryRecipe.status,
      almostCookableStatus: resultRecord.result.almostCookableRecipe.status,
      fallbackSuggestionCount:
        resultRecord.result.fallbackDatabaseSuggestions.length,
    },
  });

  return NextResponse.json({
    jobId: resultRecord.jobId,
    done: true,
    result: resultRecord.result,
  });
}
