"use client";

import { useRouter } from "next/navigation";
import { PricingCard } from "@/components/billing/PricingCard";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PricingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [currentMembership, setCurrentMembership] = useState<string>("basic");
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const t = useTranslations("pricing");
  const tBilling = useTranslations("billing");

  useEffect(() => {
    if (searchParams.get("canceled") === "true") {
      setToast({
        type: "error",
        message: tBilling("errorMessages.checkoutFailed"),
      });
    }
  }, [searchParams, tBilling]);

  useEffect(() => {
    // Fetch current membership
    if (session?.user) {
      fetch("/api/user/subscription")
        .then((res) => res.json())
        .then((data) => {
          if (data.membership) {
            setCurrentMembership(data.membership);
          }
        })
        .catch(console.error);
    }
  }, [session]);

  const handleUpgrade = async (tier: "premium" | "pro") => {
    if (status !== "authenticated") {
      router.push("/signin?callbackUrl=/pricing");
      return;
    }

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setToast({
          type: "error",
          message: data.error || tBilling("errorMessages.checkoutFailed"),
        });
      }
    } catch (error) {
      console.error("Checkout error:", error);
      setToast({
        type: "error",
        message: tBilling("errorMessages.generic"),
      });
    }
  };

  const [isManaging, setIsManaging] = useState(false);

  const handleManageSubscription = async () => {
    if (status !== "authenticated") return;

    setIsManaging(true);
    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setToast({
          type: "error",
          message: data.error || tBilling("errorMessages.generic"),
        });
        setIsManaging(false);
      }
    } catch (error) {
      console.error("Portal error:", error);
      setToast({
        type: "error",
        message: tBilling("errorMessages.generic"),
      });
      setIsManaging(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 py-16">
      <div className="container mx-auto px-4">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        {toast && (
          <div
            className={`mb-8 rounded-lg p-4 text-center ${
              toast.type === "success"
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-red-500/10 text-red-600"
            }`}
          >
            {toast.message}
          </div>
        )}

        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
            {t("title")}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        <div className="mx-auto grid max-w-3xl gap-8 md:grid-cols-2">
          <PricingCard
            tier="basic"
            price="Free"
            isCurrentPlan={currentMembership === "basic"}
          />
          <PricingCard
            tier="premium"
            price={4.99}
            isPopular
            isCurrentPlan={currentMembership === "premium"}
            onSelect={() => handleUpgrade("premium")}
          />
          {/* Pro tier - hidden for now, ready for future use
          <PricingCard
            tier="pro"
            price={9}
            isCurrentPlan={currentMembership === "pro"}
            onSelect={() => handleUpgrade("pro")}
          />
          */}
        </div>

        <div className="mt-16 text-center">
          {status === "authenticated" &&
          (currentMembership === "premium" || currentMembership === "pro") ? (
            <Button
              onClick={handleManageSubscription}
              disabled={isManaging}
              className="mx-auto border-2 border-eatrivo-white-primary"
            >
              {isManaging ? t("managingSubscription") : t("manageSubscription")}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              {status !== "authenticated" && (
                <>
                  {t("signInToUpgrade")}
                  <br />
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
