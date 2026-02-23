"use client";

import { useSession } from "next-auth/react";
import type { ReactNode } from "react";

interface FeatureFlagProps {
  /** Content shown to beta testers */
  children: ReactNode;
  /** Content shown to regular users (defaults to null) */
  fallback?: ReactNode;
  /** When true, show children while session is loading (optimistic) */
  optimistic?: boolean;
}

/**
 * Conditionally renders children only for users with isBetaTester=true.
 * Uses the session (no extra DB call) — flag is baked into the JWT.
 *
 * @example
 * <FeatureFlag fallback={<ComingSoonBanner />}>
 *   <PantryPage />
 * </FeatureFlag>
 */
export function FeatureFlag({
  children,
  fallback = null,
  optimistic = false,
}: FeatureFlagProps) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return optimistic ? <>{children}</> : null;
  }

  return session?.user?.isBetaTester ? <>{children}</> : <>{fallback}</>;
}
