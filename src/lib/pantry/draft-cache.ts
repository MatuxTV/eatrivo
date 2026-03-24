import { CacheService, RequestLock } from "@/lib/redis";

const PANTRY_DRAFT_TTL_SECONDS = 60;

export interface PantryDraftItem {
  token: string;
  name: string;
  ingredientName: string | null;
  ingredientKey: string | null;
  ingredientSpecificKey: string | null;
  trackingMode: "quantity" | "availability";
  inStock: boolean;
  quantity: string | null;
  unit: string | null;
  category: string | null;
  expiryDate: string | null;
  candidateKeys: string[];
  createdAt: string;
  expiresAt: string;
}

function draftCacheKey(userProfileId: string): string {
  return `pantry-drafts:${userProfileId}`;
}

function lockKey(userProfileId: string): string {
  return `pantry-drafts:${userProfileId}`;
}

function isDraftExpired(draft: PantryDraftItem): boolean {
  return new Date(draft.expiresAt).getTime() <= Date.now();
}

export function createPantryDraftItem(
  input: Omit<PantryDraftItem, "token" | "createdAt" | "expiresAt">,
): PantryDraftItem {
  const createdAt = new Date();
  const expiresAt = new Date(
    createdAt.getTime() + PANTRY_DRAFT_TTL_SECONDS * 1000,
  );

  return {
    ...input,
    token: crypto.randomUUID(),
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

export async function getPantryDrafts(
  userProfileId: string,
): Promise<PantryDraftItem[]> {
  const drafts =
    (await CacheService.get<PantryDraftItem[]>(draftCacheKey(userProfileId))) ??
    [];

  const activeDrafts = drafts.filter((draft) => !isDraftExpired(draft));

  if (activeDrafts.length !== drafts.length) {
    await savePantryDrafts(userProfileId, activeDrafts);
  }

  return activeDrafts;
}

export async function savePantryDrafts(
  userProfileId: string,
  drafts: PantryDraftItem[],
): Promise<void> {
  if (drafts.length === 0) {
    await CacheService.del(draftCacheKey(userProfileId));
    return;
  }

  await CacheService.set(
    draftCacheKey(userProfileId),
    drafts,
    PANTRY_DRAFT_TTL_SECONDS,
  );
}

export async function appendPantryDrafts(
  userProfileId: string,
  drafts: PantryDraftItem[],
): Promise<PantryDraftItem[]> {
  const existingDrafts = await getPantryDrafts(userProfileId);
  const nextDrafts = [...existingDrafts, ...drafts];
  await savePantryDrafts(userProfileId, nextDrafts);
  return nextDrafts;
}

export async function discardPantryDrafts(
  userProfileId: string,
  tokens?: string[],
): Promise<PantryDraftItem[]> {
  const existingDrafts = await getPantryDrafts(userProfileId);
  const nextDrafts =
    !tokens || tokens.length === 0
      ? []
      : existingDrafts.filter((draft) => !tokens.includes(draft.token));

  await savePantryDrafts(userProfileId, nextDrafts);
  return nextDrafts;
}

export async function consumePantryDrafts(
  userProfileId: string,
  tokens?: string[],
): Promise<{ selected: PantryDraftItem[]; remaining: PantryDraftItem[] }> {
  const existingDrafts = await getPantryDrafts(userProfileId);
  const selected =
    !tokens || tokens.length === 0
      ? existingDrafts
      : existingDrafts.filter((draft) => tokens.includes(draft.token));
  const remaining = existingDrafts.filter(
    (draft) => !selected.some((selectedDraft) => selectedDraft.token === draft.token),
  );

  await savePantryDrafts(userProfileId, remaining);

  return { selected, remaining };
}

export async function acquirePantryDraftLock(
  userProfileId: string,
  ttlSeconds: number = 15,
): Promise<boolean> {
  return RequestLock.acquire(lockKey(userProfileId), ttlSeconds);
}

export async function releasePantryDraftLock(
  userProfileId: string,
): Promise<void> {
  await RequestLock.release(lockKey(userProfileId));
}

export function getPantryDraftTtlSeconds(): number {
  return PANTRY_DRAFT_TTL_SECONDS;
}