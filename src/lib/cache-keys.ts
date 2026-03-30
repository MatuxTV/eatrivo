export const USER_CONTEXT_CACHE_TTL_SECONDS = 300;
export const PANTRY_VIEW_CACHE_TTL_SECONDS = 120;
export const SUBSCRIPTION_SNAPSHOT_CACHE_TTL_SECONDS = 60;
export const ADMIN_ANALYTICS_CACHE_TTL_SECONDS = 45;
export const FEATURED_RECIPES_CACHE_TTL_SECONDS = 900;

export function userContextCacheKey(userId: string) {
  return `user-context:${userId}`;
}

export function shoppingListsCacheKey(userId: string) {
  return `shopping-lists:${userId}`;
}

export function subscriptionSnapshotCacheKey(userId: string) {
  return `subscription-snapshot:${userId}`;
}

export function pantrySnapshotCacheKey(
  userProfileId: string,
  lowStockOnly: boolean,
) {
  return `pantry-view:${userProfileId}:${lowStockOnly ? "low" : "all"}`;
}

export function adminAnalyticsCacheKey(rangeDays: number) {
  return `admin-analytics:${rangeDays}`;
}

export function featuredRecipesCacheKey(
  locale: string,
  dietPreference: string | null | undefined,
) {
  const normalizedDietPreference =
    dietPreference?.trim().toLowerCase() || "none";

  return `home-featured-recipes:${locale}:${normalizedDietPreference}`;
}