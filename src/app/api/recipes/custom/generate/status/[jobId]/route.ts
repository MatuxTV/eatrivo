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
    apiLogger.warn("[customRecipe.status] unauthorized request");
    return jsonError("Unauthorized", "AUTH_REQUIRED", 401);
  }

  apiLogger.debug("[customRecipe.status] poll received", {
    metadata: {
      userId: session.user.id,
    },
  });

  const rateLimitResult = await checkRateLimit(
    getRateLimitIdentifier(request as unknown as Request, session.user.id),
    "standard",
  );
  if (!rateLimitResult.success) {
    apiLogger.warn("[customRecipe.status] rate limit exceeded", {
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
    apiLogger.warn("[customRecipe.status] invalid params", {
      metadata: {
        userId: session.user.id,
      },
    });
    return jsonError("Validation failed", "INVALID_INPUT", 400);
  }

  const progress = await CustomRecipeGenerationStore.getProgress(
    parsedParams.data.jobId,
  );
  if (!progress || progress.userId !== session.user.id) {
    apiLogger.warn("[customRecipe.status] progress not found", {
      metadata: {
        userId: session.user.id,
        jobId: parsedParams.data.jobId,
      },
    });
    return jsonError("Not found", "GENERATION_NOT_FOUND", 404);
  }

  await CustomRecipeGenerationStore.touchProgress(parsedParams.data.jobId);

  apiLogger.debug("[customRecipe.status] progress returned", {
    metadata: {
      userId: session.user.id,
      jobId: progress.jobId,
      progress: progress.progress,
      label: progress.label,
      node: progress.node,
      done: progress.done,
      failed: progress.failed,
    },
  });

  return NextResponse.json({
    jobId: progress.jobId,
    isGenerating: !progress.done,
    done: progress.done,
    failed: progress.failed,
    progress: progress.progress,
    label: progress.label,
    node: progress.node,
    retryCount: progress.retryCount,
    errorCode: progress.errorCode,
  });
}
