import { redis } from "@/lib/cache/redis";
import type { CustomRecipeResult } from "@/lib/custom-recipes/contracts";

const CUSTOM_RECIPE_PROGRESS_TTL_SECONDS = 15 * 60;
const CUSTOM_RECIPE_RESULT_TTL_SECONDS = 60 * 60;

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

function customRecipeProgressKey(userId: string): string {
  return `generation:progress:${userId}:custom-recipe`;
}

function customRecipeResultKey(userId: string): string {
  return `generation:result:${userId}:custom-recipe`;
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
  static async initializeGeneration(
    userId: string,
    jobId: string,
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

    await redis.setex(
      customRecipeProgressKey(userId),
      CUSTOM_RECIPE_PROGRESS_TTL_SECONDS,
      JSON.stringify(record),
    );
  }

  static async setProgress(
    userId: string,
    jobId: string,
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

    await redis.setex(
      customRecipeProgressKey(userId),
      CUSTOM_RECIPE_PROGRESS_TTL_SECONDS,
      JSON.stringify(record),
    );
  }

  static async setFailure(
    userId: string,
    jobId: string,
    errorCode: string,
    errorMessage: string,
  ): Promise<void> {
    await this.setProgress(userId, jobId, {
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
    userId: string,
  ): Promise<CustomRecipeProgressRecord | null> {
    return parseRedisRecord<CustomRecipeProgressRecord>(
      await redis.get(customRecipeProgressKey(userId)),
    );
  }

  static async touchProgress(userId: string): Promise<void> {
    const progressKey = customRecipeProgressKey(userId);
    const exists = await redis.exists(progressKey);
    if (exists === 1) {
      await redis.expire(progressKey, CUSTOM_RECIPE_PROGRESS_TTL_SECONDS);
    }
  }

  static async clearProgress(userId: string): Promise<void> {
    await redis.del(customRecipeProgressKey(userId));
  }

  static async setResult(
    userId: string,
    jobId: string,
    result: CustomRecipeResult,
  ): Promise<void> {
    const record: CustomRecipeResultRecord = {
      userId,
      jobId,
      result,
      createdAt: new Date().toISOString(),
    };

    await redis.setex(
      customRecipeResultKey(userId),
      CUSTOM_RECIPE_RESULT_TTL_SECONDS,
      JSON.stringify(record),
    );
  }

  static async getResult(
    userId: string,
  ): Promise<CustomRecipeResultRecord | null> {
    return parseRedisRecord<CustomRecipeResultRecord>(
      await redis.get(customRecipeResultKey(userId)),
    );
  }

  static async touchResult(userId: string): Promise<void> {
    const resultKey = customRecipeResultKey(userId);
    const exists = await redis.exists(resultKey);
    if (exists === 1) {
      await redis.expire(resultKey, CUSTOM_RECIPE_RESULT_TTL_SECONDS);
    }
  }

  static async clearResult(userId: string): Promise<void> {
    await redis.del(customRecipeResultKey(userId));
  }
}
