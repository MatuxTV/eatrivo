import { and, asc, eq } from "drizzle-orm";

import { db } from "@/index";
import { pantryRestockItems, userProfiles } from "@/db/schema";
import type { pantryItems } from "@/db/schema";
import { pantrySnapshotCacheKey } from "@/lib/cache-keys";
import { CacheService } from "@/lib/redis";
import { normalizeUnit } from "@/lib/units";

export interface RestockSeedInput {
  name: string;
  ingredientName: string | null;
  ingredientKey: string | null;
  ingredientSpecificKey: string | null;
  quantity: number | string | null;
  unit: string | null;
  category: string | null;
}

export function pantryCacheKey(userProfileId: string): string {
  return `pantry:${userProfileId}`;
}

export function pantryRestockCacheKey(userProfileId: string): string {
  return `pantry-restock:${userProfileId}`;
}

export async function invalidatePantryCaches(userProfileId: string): Promise<void> {
  await Promise.all([
    CacheService.del(pantryCacheKey(userProfileId)),
    CacheService.del(pantryRestockCacheKey(userProfileId)),
    CacheService.del(pantrySnapshotCacheKey(userProfileId, false)),
    CacheService.del(pantrySnapshotCacheKey(userProfileId, true)),
  ]);
}

export async function getUserProfileByUserId(userId: string) {
  return db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, userId),
  });
}

export function normalizeRestockUnit(unit: string | null | undefined): string | null {
  if (!unit) {
    return null;
  }

  return normalizeUnit(unit);
}

export function serializeQuantity(
  quantity: number | string | null | undefined,
): string | null {
  if (quantity === null || quantity === undefined || quantity === "") {
    return null;
  }

  return String(quantity);
}

export function parseStoredQuantity(quantity: string | null | undefined): number | null {
  if (!quantity) {
    return null;
  }

  const parsed = Number.parseFloat(quantity);
  return Number.isFinite(parsed) ? parsed : null;
}

function namesMatch(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function findMatchingRestockItem(
  restockItems: Array<typeof pantryRestockItems.$inferSelect>,
  input: {
    name: string;
    ingredientKey: string | null;
    ingredientSpecificKey: string | null;
  },
): typeof pantryRestockItems.$inferSelect | undefined {
  return restockItems.find((item) => {
    if (
      input.ingredientSpecificKey &&
      item.ingredientSpecificKey === input.ingredientSpecificKey
    ) {
      return true;
    }

    if (input.ingredientKey && item.ingredientKey === input.ingredientKey) {
      return true;
    }

    return namesMatch(item.name, input.name);
  });
}

export function findMatchingPantryItem(
  pantryRows: Array<typeof pantryItems.$inferSelect>,
  input: {
    name: string;
    ingredientKey: string | null;
    ingredientSpecificKey: string | null;
    unit: string | null;
  },
): typeof pantryItems.$inferSelect | undefined {
  return pantryRows.find((item) => {
    const matchesIdentity = input.ingredientSpecificKey
      ? item.ingredientSpecificKey === input.ingredientSpecificKey
      : input.ingredientKey
        ? item.ingredientKey === input.ingredientKey
        : namesMatch(item.name, input.name);

    if (!matchesIdentity) {
      return false;
    }

    const leftUnit = normalizeRestockUnit(item.unit);
    const rightUnit = normalizeRestockUnit(input.unit);
    return leftUnit === rightUnit;
  });
}

export async function upsertRestockItem(
  userProfileId: string,
  input: RestockSeedInput,
) {
  const currentItems = await db
    .select()
    .from(pantryRestockItems)
    .where(eq(pantryRestockItems.userProfileId, userProfileId))
    .orderBy(asc(pantryRestockItems.createdAt));

  const existing = findMatchingRestockItem(currentItems, input);
  const payload = {
    name: input.name.trim(),
    ingredientName: input.ingredientName,
    ingredientKey: input.ingredientKey,
    ingredientSpecificKey: input.ingredientSpecificKey,
    defaultQuantity: serializeQuantity(input.quantity),
    defaultUnit: normalizeRestockUnit(input.unit),
    category: input.category,
    isActive: true,
    updatedAt: new Date(),
  };

  if (existing) {
    const [updated] = await db
      .update(pantryRestockItems)
      .set(payload)
      .where(
        and(
          eq(pantryRestockItems.id, existing.id),
          eq(pantryRestockItems.userProfileId, userProfileId),
        ),
      )
      .returning();

    await invalidatePantryCaches(userProfileId);
    return updated;
  }

  const [created] = await db
    .insert(pantryRestockItems)
    .values({
      userProfileId,
      ...payload,
    })
    .returning();

  await invalidatePantryCaches(userProfileId);
  return created;
}