"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SubscriptionStatus } from "@/components/billing/SubscriptionStatus";
import { PricingCard } from "@/components/billing/PricingCard";
import { ArrowLeft, Loader2 } from "lucide-react";
import { trackClientEvent } from "@/lib/analytics/analytics-client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

interface SubscriptionData {
  membership: "basic" | "premium" | "pro" | "trainer";
  trialDaysLeft: number;
  subscription: {
    status: "active" | "canceled" | "past_due" | "gifted";
    currentPeriodEnd: string | null;
    cancelAt: string | null;
    isGifted: boolean;
    giftReason: string | null;
  } | null;
}

export default function BillingPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasTrackedPageView = useRef(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const t = useTranslations("billing");
  const locale = useLocale();

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setToast({
        type: "success",
        message: t("successMessage"),
      });
    }
  }, [searchParams, t]);

  useEffect(() => {
    fetchSubscription();
  }, []);

  useEffect(() => {
    if (loading || hasTrackedPageView.current) {
      return;
    }

    trackClientEvent({
      eventName: "billing_page_viewed",
      metadata: {
        locale,
        membership: data?.membership || "basic",
        has_active_subscription: Boolean(data?.subscription),
      },
    });
    hasTrackedPageView.current = true;
  }, [data?.membership, data?.subscription, loading, locale]);

  const fetchSubscription = async () => {
    try {
      const res = await fetch("/api/user/subscription");
      if (res.ok) {
        const subscriptionData = await res.json();
        setData(subscriptionData);
      }
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      trackClientEvent({
        eventName: "billing_portal_opened",
        metadata: {
          locale,
          membership: data?.membership || "basic",
          surface: "billing_page",
        },
      });

      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const { url, error } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        setToast({
          type: "error",
          message: error || t("errorMessages.portalFailed"),
        });
      }
    } catch (error) {
      console.error("Portal error:", error);
      setToast({ type: "error", message: t("errorMessages.generic") });
    }
  };

  const handleUpgrade = async (tier: "premium" | "pro") => {
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          locale,
          sourcePage: "billing",
          surface: "billing_page",
        }),
      });
      const { url, error } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        setToast({
          type: "error",
          message: error || t("errorMessages.checkoutFailed"),
        });
      }
    } catch (error) {
      console.error("Checkout error:", error);
      setToast({ type: "error", message: t("errorMessages.generic") });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const membership = data?.membership || "basic";
  const showUpgradeOptions = membership === "basic";

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">{t("title")}</h1>

      <Button
        variant="ghost"
        onClick={() => router.push("/home")}
        className="mb-6 flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      {toast && (
        <div
          className={`mb-6 rounded-lg p-4 ${
            toast.type === "success"
              ? "bg-emerald-500/10 text-emerald-600"
              : "bg-red-500/10 text-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="mb-8">
        <SubscriptionStatus
          membership={membership}
          status={data?.subscription?.status}
          currentPeriodEnd={
            data?.subscription?.currentPeriodEnd
              ? new Date(data.subscription.currentPeriodEnd)
              : null
          }
          cancelAt={
            data?.subscription?.cancelAt
              ? new Date(data.subscription.cancelAt)
              : null
          }
          isGifted={data?.subscription?.isGifted}
          onManageSubscription={handleManageSubscription}
        />
      </div>

      {data?.subscription?.isGifted && data.subscription.giftReason && (
        <div className="mb-8 rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
          <p className="text-sm text-violet-600">
            <strong>{t("giftNote")}:</strong> {data.subscription.giftReason}
          </p>
        </div>
      )}

      {showUpgradeOptions && (
        <div>
          <h2 className="mb-6 text-xl font-semibold">{t("upgradePlan")}</h2>
          <div className="grid gap-6 md:grid-cols-1 max-w-md">
            <PricingCard
              tier="premium"
              price={3.99}
              trialDays={data?.trialDaysLeft}
              onSelect={() => handleUpgrade("premium")}
            />
          </div>
        </div>
      )}
    </div>
  );
}