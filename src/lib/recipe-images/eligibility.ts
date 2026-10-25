// Who gets AI cover photos. Pure on purpose (no db access) so it is unit-testable;
// the service loads the owner's role and membership and passes them in.

/** Memberships that include AI photos for the user's own custom recipes. */
export const PAID_MEMBERSHIPS = ["premium", "pro", "trainer"] as const;

export interface RecipeImageOwner {
  role: string | null;
  membership: string | null;
  /** True when a premium/pro subscription has lapsed but the user is not yet downgraded. */
  subscriptionExpired: boolean;
}

export function isPaidMembership(membership: string | null | undefined): boolean {
  return (PAID_MEMBERSHIPS as readonly string[]).includes(membership ?? "");
}

/**
 * Catalog recipes always get a photo. Custom recipes only when their owner is an
 * admin or has an active paid membership; free users' recipes stay without one.
 */
export function isRecipeImageEligible(input: {
  source: string;
  owner: RecipeImageOwner | null;
}): boolean {
  if (input.source === "catalog") {
    return true;
  }

  const { owner } = input;
  if (!owner) {
    return false;
  }

  if (owner.role === "admin") {
    return true;
  }

  return isPaidMembership(owner.membership) && !owner.subscriptionExpired;
}
