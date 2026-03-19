import { redis } from "@/lib/redis";
import type { CustomRecipeResult } from "@/lib/custom-recipes/contracts";

const CUSTOM_RECIPE_PROGRESS_TTL_SECONDS = 15 * 60;
const CUSTOM_RECIPE_RESULT_TTL_SECONDS = 60 * 60;
const CUSTOM_RECIPE_ACTIVE_JOB_TTL_SECONDS = 15 * 60;

export interface CustomRecipeProgressRecord {
  userId: string;
  jobId: string;
  progress: number;
  label: string;
  node: string;
  retryCount: number;
  done: boolean;
  failed: boolean;
  errorCode?: string;
  errorMessage?: string;
  updatedAt: string;
}

interface CustomRecipeResultRecord {
  userId: string;
  jobId: string;
  result: CustomRecipeResult;
  createdAt: string;
}

export interface CustomRecipeActiveJobRecord {
  userId: string;
  jobId: string;
}

function customRecipeProgressKey(jobId: string): string {
  return `generation:progress:${jobId}`;
}

function customRecipeResultKey(jobId: string): string {
  return `generation:result:${jobId}`;
}

function customRecipeActiveJobKey(userId: string): string {
  return `generation:active:${userId}:custom-recipe`;
}

export function customRecipeGenerationLockKey(userId: string): string {
  return `custom-recipe-generation:${userId}`;
}

function parseRedisRecord<T>(value: unknown): T | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return JSON.parse(value) as T;
  }

  return value as T;
}

export class CustomRecipeGenerationStore {
  static async initializeJob(
    jobId: string,
    userId: string,
    initial: Pick<
      CustomRecipeProgressRecord,
      "progress" | "label" | "node" | "retryCount"
    >,
  ): Promise<void> {
    const record: CustomRecipeProgressRecord = {
      userId,
      jobId,
      progress: initial.progress,
      label: initial.label,
      node: initial.node,
      retryCount: initial.retryCount,
      done: false,
      failed: false,
      updatedAt: new Date().toISOString(),
    };

    await Promise.all([
      redis.setex(
        customRecipeProgressKey(jobId),
        CUSTOM_RECIPE_PROGRESS_TTL_SECONDS,
        JSON.stringify(record),
      ),
      redis.setex(
        customRecipeActiveJobKey(userId),
        CUSTOM_RECIPE_ACTIVE_JOB_TTL_SECONDS,
        jobId,
      ),
    ]);
  }

  static async setProgress(
    jobId: string,
    userId: string,
    update: Pick<
      CustomRecipeProgressRecord,
      "progress" | "label" | "node" | "retryCount" | "done" | "failed"
    > &
      Partial<Pick<CustomRecipeProgressRecord, "errorCode" | "errorMessage">>,
  ): Promise<void> {
    const record: CustomRecipeProgressRecord = {
      userId,
      jobId,
      progress: update.progress,
      label: update.label,
      node: update.node,
      retryCount: update.retryCount,
      done: update.done,
      failed: update.failed,
      errorCode: update.errorCode,
      errorMessage: update.errorMessage,
      updatedAt: new Date().toISOString(),
    };

    await Promise.all([
      redis.setex(
        customRecipeProgressKey(jobId),
        CUSTOM_RECIPE_PROGRESS_TTL_SECONDS,
        JSON.stringify(record),
      ),
      redis.setex(
        customRecipeActiveJobKey(userId),
        CUSTOM_RECIPE_ACTIVE_JOB_TTL_SECONDS,
        jobId,
      ),
    ]);
  }

  static async setFailure(
    jobId: string,
    userId: string,
    errorCode: string,
    errorMessage: string,
  ): Promise<void> {
    await this.setProgress(jobId, userId, {
      progress: 100,
      label: "customRecipe.failed",
      node: "failed",
      retryCount: 0,
      done: true,
      failed: true,
      errorCode,
      errorMessage,
    });
  }

  static async getProgress(
    jobId: string,
  ): Promise<CustomRecipeProgressRecord | null> {
    return parseRedisRecord<CustomRecipeProgressRecord>(
      await redis.get(customRecipeProgressKey(jobId)),
    );
  }

  static async touchProgress(jobId: string): Promise<void> {
    const progressKey = customRecipeProgressKey(jobId);
    const exists = await redis.exists(progressKey);
    if (exists === 1) {
      await redis.expire(progressKey, CUSTOM_RECIPE_PROGRESS_TTL_SECONDS);
    }
  }

  static async setResult(
    jobId: string,
    userId: string,
    result: CustomRecipeResult,
  ): Promise<void> {
    const record: CustomRecipeResultRecord = {
      userId,
      jobId,
      result,
      createdAt: new Date().toISOString(),
    };

    await redis.setex(
      customRecipeResultKey(jobId),
      CUSTOM_RECIPE_RESULT_TTL_SECONDS,
      JSON.stringify(record),
    );
  }

  static async getResult(
    jobId: string,
  ): Promise<CustomRecipeResultRecord | null> {
    return parseRedisRecord<CustomRecipeResultRecord>(
      await redis.get(customRecipeResultKey(jobId)),
    );
  }

  static async touchResult(jobId: string): Promise<void> {
    const resultKey = customRecipeResultKey(jobId);
    const exists = await redis.exists(resultKey);
    if (exists === 1) {
      await redis.expire(resultKey, CUSTOM_RECIPE_RESULT_TTL_SECONDS);
    }
  }

  static async getActiveJob(
    userId: string,
  ): Promise<CustomRecipeActiveJobRecord | null> {
    const jobId = await redis.get(customRecipeActiveJobKey(userId));

    if (typeof jobId !== "string" || jobId.length === 0) {
      return null;
    }

    return {
      userId,
      jobId,
    };
  }

  static async touchActiveJob(userId: string): Promise<void> {
    const activeKey = customRecipeActiveJobKey(userId);
    const exists = await redis.exists(activeKey);
    if (exists === 1) {
      await redis.expire(activeKey, CUSTOM_RECIPE_ACTIVE_JOB_TTL_SECONDS);
    }
  }

  static async clearActiveJob(userId: string): Promise<void> {
    await redis.del(customRecipeActiveJobKey(userId));
  }
}
