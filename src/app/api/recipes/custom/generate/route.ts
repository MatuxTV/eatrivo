import type { NextRequest } from "next/server";
import { NextResponse, after } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "../../../../../../auth";
import { userProfiles } from "@/db/schema";
import { customRecipeStartRequestSchema } from "@/lib/custom-recipes/contracts";
import {
  CustomRecipeGenerationStore,
  customRecipeGenerationLockKey,
} from "@/lib/custom-recipes/store";
import { db } from "@/lib/db/pool";
import { buildCustomRecipeGraph } from "@/lib/langgraph/custom-recipe";
import {
  INITIAL_PROGRESS,
  NODE_PROGRESS,
} from "@/lib/langgraph/custom-recipe/constants";
import type { CustomRecipeState } from "@/lib/langgraph/custom-recipe/state";
import { apiLogger } from "@/lib/logger";
import { RequestLock } from "@/lib/redis";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";

function jsonError(
  error: string,
  code: string,
  status: number,
  headers?: HeadersInit,
) {
  return NextResponse.json({ error, code }, { status, headers });
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    apiLogger.warn("[customRecipe.generate] unauthorized active-job request");
    return jsonError("Unauthorized", "AUTH_REQUIRED", 401);
  }

  const rateLimitResult = await checkRateLimit(
    getRateLimitIdentifier(request as unknown as Request, session.user.id),
    "standard",
  );
  if (!rateLimitResult.success) {
    return jsonError(
      "Too many requests",
      "RATE_LIMITED",
      429,
      rateLimitResult.response?.headers,
    );
  }

  const activeJob = await CustomRecipeGenerationStore.getActiveJob(
    session.user.id,
  );

  if (!activeJob) {
    return NextResponse.json({
      jobId: null,
      isGenerating: false,
    });
  }

  const progress = await CustomRecipeGenerationStore.getProgress(activeJob.jobId);
  if (!progress || progress.userId !== session.user.id || progress.done) {
    await CustomRecipeGenerationStore.clearActiveJob(session.user.id);

    return NextResponse.json({
      jobId: null,
      isGenerating: false,
    });
  }

  await CustomRecipeGenerationStore.touchActiveJob(session.user.id);
  await CustomRecipeGenerationStore.touchProgress(activeJob.jobId);

  return NextResponse.json({
    jobId: activeJob.jobId,
    isGenerating: true,
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    apiLogger.warn("[customRecipe.generate] unauthorized request");
    return jsonError("Unauthorized", "AUTH_REQUIRED", 401);
  }

  apiLogger.info("[customRecipe.generate] request received", {
    metadata: {
      userId: session.user.id,
    },
  });

  const rateLimitResult = await checkRateLimit(
    getRateLimitIdentifier(request as unknown as Request, session.user.id),
    "expensive",
  );
  if (!rateLimitResult.success) {
    apiLogger.warn("[customRecipe.generate] rate limit exceeded", {
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

  const parsedBody = customRecipeStartRequestSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsedBody.success) {
    apiLogger.warn("[customRecipe.generate] invalid request body", {
      metadata: {
        userId: session.user.id,
        issues: parsedBody.error.issues.length,
      },
    });
    return jsonError("Validation failed", "INVALID_INPUT", 400);
  }

  apiLogger.info("[customRecipe.generate] request validated", {
    metadata: {
      userId: session.user.id,
      locale: parsedBody.data.locale ?? "en",
      fallbackSuggestionLimit: parsedBody.data.fallbackSuggestionLimit,
    },
  });

  const userProfile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, session.user.id),
    columns: {
      id: true,
    },
  });

  if (!userProfile) {
    apiLogger.warn("[customRecipe.generate] profile missing", {
      metadata: {
        userId: session.user.id,
      },
    });
    return jsonError("Not found", "PROFILE_NOT_FOUND", 404);
  }

  const userId = session.user.id;
  const lockKey = customRecipeGenerationLockKey(userId);
  const lockAcquired = await RequestLock.acquire(lockKey, 300);

  if (!lockAcquired) {
    const activeJob = await CustomRecipeGenerationStore.getActiveJob(userId);

    apiLogger.warn("[customRecipe.generate] generation already in progress", {
      metadata: {
        userId,
        jobId: activeJob?.jobId ?? null,
      },
    });

    if (activeJob) {
      await CustomRecipeGenerationStore.touchActiveJob(userId);

      return NextResponse.json(
        {
          jobId: activeJob.jobId,
          status: "in_progress",
        },
        { status: 202 },
      );
    }

    return jsonError(
      "Custom recipe generation already in progress",
      "GENERATION_IN_PROGRESS",
      429,
    );
  }

  const jobId = crypto.randomUUID();

  await CustomRecipeGenerationStore.initializeJob(jobId, userId, {
    progress: INITIAL_PROGRESS.progress,
    label: INITIAL_PROGRESS.label,
    node: "fetch_profile",
    retryCount: 0,
  });

  apiLogger.info("[customRecipe.generate] job initialized", {
    metadata: {
      userId,
      userProfileId: userProfile.id,
      jobId,
      locale: parsedBody.data.locale ?? "en",
      fallbackSuggestionLimit: parsedBody.data.fallbackSuggestionLimit,
    },
  });

  after(async () => {
    try {
      apiLogger.info("[customRecipe.generate] background execution started", {
        metadata: {
          jobId,
          userId,
          userProfileId: userProfile.id,
        },
      });

      const graph = buildCustomRecipeGraph();
      const stream = await graph.stream(
        {
          userId,
          userProfileId: userProfile.id,
          locale: parsedBody.data.locale ?? "en",
          fallbackSuggestionLimit: parsedBody.data.fallbackSuggestionLimit,
        },
        { streamMode: "updates" },
      );

      for await (const update of stream) {
        const nodeName = Object.keys(update)[0];
        const nodeState = update[nodeName] as Partial<
          typeof CustomRecipeState.State
        >;

        if (nodeState?.fatalError) {
          apiLogger.error(
            "[customRecipe.generate] graph fatal error",
            undefined,
            {
              metadata: {
                jobId,
                userId,
                nodeName,
                fatalError: nodeState.fatalError,
                fatalErrorCode: nodeState.fatalErrorCode,
              },
            },
          );
          await CustomRecipeGenerationStore.setFailure(
            jobId,
            userId,
            nodeState.fatalErrorCode ?? "GENERATION_FAILED",
            nodeState.fatalError,
          );
          break;
        }

        const progressInfo = NODE_PROGRESS[nodeName];
        if (progressInfo) {
          apiLogger.info("[customRecipe.generate] node progressed", {
            metadata: {
              jobId,
              userId,
              nodeName,
              progress: progressInfo.progress,
              label: progressInfo.label,
              retryCount: nodeState?.retryCount ?? 0,
            },
          });
          await CustomRecipeGenerationStore.setProgress(jobId, userId, {
            progress: progressInfo.progress,
            label: progressInfo.label,
            node: nodeName,
            retryCount: nodeState?.retryCount ?? 0,
            done: false,
            failed: false,
          });
        }

        if (nodeName === "finalize_result" && nodeState?.finalResult) {
          apiLogger.info("[customRecipe.generate] final result ready", {
            metadata: {
              jobId,
              userId,
              fallbackUsed: nodeState.finalResult.meta.fallbackUsed,
              pantryRecipeStatus: nodeState.finalResult.pantryRecipe.status,
              almostCookableStatus:
                nodeState.finalResult.almostCookableRecipe.status,
              fallbackSuggestionCount:
                nodeState.finalResult.fallbackDatabaseSuggestions.length,
            },
          });
          await CustomRecipeGenerationStore.setResult(
            jobId,
            userId,
            nodeState.finalResult,
          );
          await CustomRecipeGenerationStore.setProgress(jobId, userId, {
            progress: 100,
            label: "customRecipe.done",
            node: nodeName,
            retryCount: nodeState.retryCount ?? 0,
            done: true,
            failed: false,
          });

          apiLogger.info("[customRecipe.generate] job completed", {
            metadata: {
              jobId,
              userId,
            },
          });
        }
      }
    } catch (error) {
      apiLogger.error("[customRecipe.generate] background flow failed", error, {
        metadata: {
          jobId,
          userId,
        },
      });

      await CustomRecipeGenerationStore.setFailure(
        jobId,
        userId,
        "GENERATION_FAILED",
        "Custom recipe generation failed",
      );
    } finally {
      await RequestLock.release(lockKey);
      await CustomRecipeGenerationStore.clearActiveJob(userId);

      apiLogger.info("[customRecipe.generate] cleanup finished", {
        metadata: {
          jobId,
          userId,
        },
      });
    }
  });

  apiLogger.info("[customRecipe.generate] accepted", {
    metadata: {
      jobId,
      userId,
    },
  });

  return NextResponse.json(
    {
      jobId,
      status: "started",
    },
    { status: 202 },
  );
}
