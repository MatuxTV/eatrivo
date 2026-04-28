"use client";

import { Button } from "@/components/ui/button";
import { Calendar, CreditCard, Gift, Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { formatDate } from "@/lib/utils/formatters";

interface SubscriptionStatusProps {
  membership: "basic" | "premium" | "pro" | "trainer";
  status?: "active" | "canceled" | "past_due" | "gifted";
  currentPeriodEnd?: Date | null;
  cancelAt?: Date | null;
  isGifted?: boolean;
  onManageSubscription?: () => void;
}

export function SubscriptionStatus({
  membership,
  status = "active",
  currentPeriodEnd,
  cancelAt,
  isGifted = false,
  onManageSubscription,
}: SubscriptionStatusProps) {
  const [loading, setLoading] = useState(false);
  const t = useTranslations("billing");
  const tPricing = useTranslations("pricing");
  const locale = useLocale();

  // Determine if subscription is scheduled for cancellation
  const isScheduledForCancellation = !!cancelAt;
  
  // Get the effective cancellation date (cancelAt takes priority)
  const cancellationDate = cancelAt || currentPeriodEnd;

  const handleManage = async () => {
    setLoading(true);
    try {
      await onManageSubscription?.();
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    active: "text-emerald-500",
    canceled: "text-red-500",
    past_due: "text-amber-500",
    gifted: "text-violet-500",
  };

  const statusKey = status === "past_due" ? "pastDue" : status;

  return (
    <div className="rounded-xl border bg-eatrivo-white-secondary p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">{t("currentPlan")}</h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            <span>{t("currentPlan")}</span>
          </div>
          <span className="font-semibold">
            {tPricing(`tiers.${membership}.name`)}
          </span>
        </div>

        {membership !== "basic" && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                {isGifted ? (
                  <Gift className="h-4 w-4" />
                ) : (
                  <span className="h-4 w-4">•</span>
                )}
                <span>Status</span>
              </div>
              <span className={statusColors[status]}>
                {t(`status.${statusKey}`)}
              </span>
            </div>

            {currentPeriodEnd && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {isScheduledForCancellation ? t("expiresOn") : t("renewsOn")}
                  </span>
                </div>
                <span>{formatDate(currentPeriodEnd, locale)}</span>
              </div>
            )}

            {isScheduledForCancellation && cancellationDate && (
              <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-600">
                {t("scheduledForCancellation")}{" "}
                {formatDate(cancellationDate, locale)}
              </p>
            )}
          </>
        )}

        {membership !== "basic" && !isGifted && (
          <Button
            className="mt-4 w-full"
            onClick={handleManage}
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("managePlan")}
          </Button>
        )}

        {membership === "basic" && (
          <p className="text-sm text-muted-foreground">{t("freeAccount")}</p>
        )}
      </div>
    </div>
  );
}
