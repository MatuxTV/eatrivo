import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "../../../../../../auth";
import { userProfiles } from "@/db/schema";
import {
  customRecipeCurrentGenerationResponseSchema,
  customRecipeErrorStreamEventSchema,
  customRecipeFinalStreamEventSchema,
  customRecipeProgressStreamEventSchema,
  customRecipeStartRequestSchema,
  type CustomRecipeStreamEvent,
} from "@/lib/custom-recipes/contracts";
import {
  CustomRecipeGenerationStore,
  customRecipeGenerationLockKey,
} from "@/lib/custom-recipes/store";
import { db } from "@/lib/db/pool";
import { buildCustomRecipeGraph } from "@/lib/langgraph/custom-recipe";
import {
  CUSTOM_RECIPE_GRAPH_RECURSION_LIMIT,
  INITIAL_PROGRESS,
  NODE_PROGRESS,
} from "@/lib/langgraph/custom-recipe/constants";
import type { CustomRecipeState } from "@/lib/langgraph/custom-recipe/state";
import { trackEvent } from "@/lib/analytics/analytics";
import { apiLogger } from "@/lib/logger";
import { RequestLock } from "@/lib/cache/redis";
import { checkRateLimit, getRateLimitIdentifier } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CUSTOM_RECIPE_LOCK_TTL_SECONDS = 300;

function jsonError(
  error: string,
  code: string,
  status: number,
  headers?: HeadersInit,
) {
  return NextResponse.json({ error, code }, { status, headers });
}

function writeEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  event: CustomRecipeStreamEvent,
) {
  controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
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

  const progress = await CustomRecipeGenerationStore.getProgress(session.user.id);
  const isGenerating = await RequestLock.isLocked(
    customRecipeGenerationLockKey(session.user.id),
  );

  if (!isGenerating) {
    if (progress?.done || progress?.failed) {
      await CustomRecipeGenerationStore.clearProgress(session.user.id);
    }

    return NextResponse.json(customRecipeCurrentGenerationResponseSchema.parse({
      jobId: null,
      isGenerating: false,
    }));
  }

  if (!progress || progress.userId !== session.user.id || progress.done) {
    return NextResponse.json(customRecipeCurrentGenerationResponseSchema.parse({
      jobId: null,
      isGenerating: true,
    }));
  }

  await CustomRecipeGenerationStore.touchProgress(session.user.id);

  return NextResponse.json(customRecipeCurrentGenerationResponseSchema.parse({
    jobId: progress.jobId,
    isGenerating: true,
    progress: progress.progress,
    label: progress.label,
    node: progress.node,
    retryCount: progress.retryCount,
  }));
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
      mode: parsedBody.data.mode,
      locale: parsedBody.data.locale ?? "en",
      fallbackSuggestionLimit: parsedBody.data.fallbackSuggestionLimit,
      servings: parsedBody.data.servings,
      mealType: parsedBody.data.mealType,
      mealPrep: parsedBody.data.mealPrep,
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
  const lockAcquired = await RequestLock.acquire(
    lockKey,
    CUSTOM_RECIPE_LOCK_TTL_SECONDS,
  );

  if (!lockAcquired) {
    apiLogger.warn("[customRecipe.generate] generation already in progress", {
      metadata: {
        userId,
      },
    });

    return jsonError(
      "Custom recipe generation already in progress",
      "GENERATION_IN_PROGRESS",
      429,
    );
  }

  const jobId = crypto.randomUUID();

  await trackEvent({
    userId,
    eventName: "custom_recipe_generation_started",
    metadata: {
      locale: parsedBody.data.locale ?? "en",
      fallbackSuggestionLimit: parsedBody.data.fallbackSuggestionLimit,
      servings: parsedBody.data.servings,
      mealType: parsedBody.data.mealType,
      mealPrep: parsedBody.data.mealPrep,
      mode: parsedBody.data.mode,
      source: "custom_recipe_generator",
      jobId,
    },
  });

  await CustomRecipeGenerationStore.initializeGeneration(userId, jobId, {
    progress: INITIAL_PROGRESS.progress,
    label: INITIAL_PROGRESS.label,
    node: "fetch_profile",
    retryCount: 0,
  });

  apiLogger.info("[customRecipe.generate] stream accepted", {
    metadata: {
      userId,
      userProfileId: userProfile.id,
      jobId,
      locale: parsedBody.data.locale ?? "en",
      mode: parsedBody.data.mode,
      fallbackSuggestionLimit: parsedBody.data.fallbackSuggestionLimit,
      servings: parsedBody.data.servings,
      mealType: parsedBody.data.mealType,
      mealPrep: parsedBody.data.mealPrep,
    },
  });

  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream<Uint8Array>({
      async start(controller) {
        let fallbackNodeSeen = false;

        try {
          writeEvent(controller, encoder, customRecipeProgressStreamEventSchema.parse({
            type: "progress",
            jobId,
            progress: INITIAL_PROGRESS.progress,
            label: INITIAL_PROGRESS.label,
            node: "fetch_profile",
            retryCount: 0,
            done: false,
            failed: false,
          }));

          const graph = buildCustomRecipeGraph();
          const stream = await graph.stream(
            {
              userId,
              userProfileId: userProfile.id,
              locale: parsedBody.data.locale ?? "en",
              mode: parsedBody.data.mode,
              fallbackSuggestionLimit: parsedBody.data.fallbackSuggestionLimit,
              requestedServings: parsedBody.data.servings,
              requestedMealType: parsedBody.data.mealType,
              requestedMealPrep: parsedBody.data.mealPrep,
            },
            {
              streamMode: "updates",
              recursionLimit: CUSTOM_RECIPE_GRAPH_RECURSION_LIMIT,
            },
          );

          for await (const update of stream) {
            const nodeName = Object.keys(update)[0];
            if (!nodeName) {
              continue;
            }

            const nodeState = update[nodeName] as Partial<
              typeof CustomRecipeState.State
            >;

            await Promise.all([
              RequestLock.refresh(lockKey, CUSTOM_RECIPE_LOCK_TTL_SECONDS),
              CustomRecipeGenerationStore.touchProgress(userId),
            ]);

            if (nodeState?.fatalError) {
              const errorCode = nodeState.fatalErrorCode ?? "GENERATION_FAILED";
              const errorMessage =
                nodeState.fatalError ?? "Custom recipe generation failed";

              apiLogger.error(
                "[customRecipe.generate] graph fatal error",
                undefined,
                {
                  metadata: {
                    jobId,
                    userId,
                    nodeName,
                    fatalError: nodeState.fatalError,
                    fatalErrorCode: errorCode,
                  },
                },
              );

              await CustomRecipeGenerationStore.setFailure(
                userId,
                jobId,
                errorCode,
                errorMessage,
              );

              await trackEvent({
                userId,
                eventName: "custom_recipe_generation_failed",
                metadata: {
                  locale: parsedBody.data.locale ?? "en",
                  fallbackSuggestionLimit: parsedBody.data.fallbackSuggestionLimit,
                  servings: parsedBody.data.servings,
                  mealType: parsedBody.data.mealType,
                  mealPrep: parsedBody.data.mealPrep,
                  reason: errorMessage,
                  code: errorCode,
                  node: nodeName,
                  source: "custom_recipe_generator",
                  jobId,
                },
              });

              writeEvent(controller, encoder, customRecipeErrorStreamEventSchema.parse({
                type: "error",
                jobId,
                code: errorCode,
                message: errorMessage,
                progress: 100,
                label: "customRecipe.failed",
                node: nodeName,
              }));
              return;
            }

            const progressInfo = NODE_PROGRESS[nodeName];
            if (progressInfo) {
              const retryCount = nodeState?.retryCount ?? 0;

              apiLogger.info("[customRecipe.generate] node progressed", {
                metadata: {
                  jobId,
                  userId,
                  nodeName,
                  progress: progressInfo.progress,
                  label: progressInfo.label,
                  retryCount,
                },
              });

              await CustomRecipeGenerationStore.setProgress(userId, jobId, {
                progress: progressInfo.progress,
                label: progressInfo.label,
                node: nodeName,
                retryCount,
                done: false,
                failed: false,
              });

              writeEvent(controller, encoder, customRecipeProgressStreamEventSchema.parse({
                type: "progress",
                jobId,
                progress: progressInfo.progress,
                label: progressInfo.label,
                node: nodeName,
                retryCount,
                done: false,
                failed: false,
              }));
            }

            if (nodeName === "fallback_database_recommendations") {
              fallbackNodeSeen = true;
            }

            if (nodeName === "finalize_result" && nodeState?.finalResult) {
              if (
                nodeState.finalResult.meta.fallbackUsed &&
                !fallbackNodeSeen
              ) {
                apiLogger.info(
                  "[customRecipe.generate] waiting for fallback recommendations",
                  {
                    metadata: {
                      jobId,
                      userId,
                      retryCount: nodeState.retryCount ?? 0,
                    },
                  },
                );

                continue;
              }

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

              const retryCount = nodeState.retryCount ?? 0;

              await trackEvent({
                userId,
                eventName: "custom_recipe_generated",
                metadata: {
                  locale: parsedBody.data.locale ?? "en",
                  fallbackSuggestionLimit: parsedBody.data.fallbackSuggestionLimit,
                  servings: parsedBody.data.servings,
                  mealType: parsedBody.data.mealType,
                  mealPrep: parsedBody.data.mealPrep,
                  fallbackUsed: nodeState.finalResult.meta.fallbackUsed,
                  retryCount,
                  pantryRecipeStatus: nodeState.finalResult.pantryRecipe.status,
                  almostCookableStatus:
                    nodeState.finalResult.almostCookableRecipe.status,
                  fallbackSuggestionCount:
                    nodeState.finalResult.fallbackDatabaseSuggestions.length,
                  pantryItemCount: nodeState.finalResult.meta.pantryItemCount,
                  source: "custom_recipe_generator",
                  jobId,
                },
              });

              await Promise.all([
                CustomRecipeGenerationStore.setResult(
                  userId,
                  jobId,
                  nodeState.finalResult,
                ),
                CustomRecipeGenerationStore.setProgress(userId, jobId, {
                  progress: 100,
                  label: "customRecipe.done",
                  node: nodeName,
                  retryCount,
                  done: true,
                  failed: false,
                }),
              ]);

              writeEvent(controller, encoder, customRecipeFinalStreamEventSchema.parse({
                type: "final",
                jobId,
                progress: 100,
                label: "customRecipe.done",
                node: nodeName,
                retryCount,
                done: true,
                userCreated: true,
                result: nodeState.finalResult,
              }));

              apiLogger.info("[customRecipe.generate] job completed", {
                metadata: {
                  jobId,
                  userId,
                },
              });
              return;
            }
          }

          await CustomRecipeGenerationStore.setFailure(
            userId,
            jobId,
            "GENERATION_FAILED",
            "Custom recipe generation completed without a final result",
          );

          await trackEvent({
            userId,
            eventName: "custom_recipe_generation_failed",
            metadata: {
              locale: parsedBody.data.locale ?? "en",
              fallbackSuggestionLimit: parsedBody.data.fallbackSuggestionLimit,
              servings: parsedBody.data.servings,
              mealType: parsedBody.data.mealType,
              mealPrep: parsedBody.data.mealPrep,
              reason: "missing_final_result",
              source: "custom_recipe_generator",
              jobId,
            },
          });

          writeEvent(controller, encoder, customRecipeErrorStreamEventSchema.parse({
            type: "error",
            jobId,
            code: "GENERATION_FAILED",
            message: "Custom recipe generation completed without a final result",
            progress: 100,
            label: "customRecipe.failed",
            node: "finalize_result",
          }));
        } catch (error) {
          apiLogger.error("[customRecipe.generate] streaming flow failed", error, {
            metadata: {
              jobId,
              userId,
            },
          });

          const errorMessage =
            error instanceof Error
              ? error.message
              : "Custom recipe generation failed";

          await CustomRecipeGenerationStore.setFailure(
            userId,
            jobId,
            "GENERATION_FAILED",
            errorMessage,
          );

          await trackEvent({
            userId,
            eventName: "custom_recipe_generation_failed",
            metadata: {
              locale: parsedBody.data.locale ?? "en",
              fallbackSuggestionLimit: parsedBody.data.fallbackSuggestionLimit,
              servings: parsedBody.data.servings,
              mealType: parsedBody.data.mealType,
              mealPrep: parsedBody.data.mealPrep,
              reason: errorMessage,
              source: "custom_recipe_generator",
              jobId,
            },
          });

          writeEvent(controller, encoder, customRecipeErrorStreamEventSchema.parse({
            type: "error",
            jobId,
            code: "GENERATION_FAILED",
            message: errorMessage,
            progress: 100,
            label: "customRecipe.failed",
            node: "failed",
          }));
        } finally {
          await RequestLock.release(lockKey);

          apiLogger.info("[customRecipe.generate] cleanup finished", {
            metadata: {
              jobId,
              userId,
            },
          });

          controller.close();
        }
      },
    }),
    {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
