"use client";

import { useRouter } from "next/navigation";
import { PricingCard } from "@/components/billing/PricingCard";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

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
    <div className="min-h-screen bg-eatrivo-white-primary relative overflow-hidden">
      {/* Subtle background ambient blobs */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-eatrivo-purple/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-eatrivo-pink/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="container mx-auto px-4 py-12 md:py-16 relative z-10">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-8 flex items-center gap-2 text-eatrivo-black-secondary hover:text-eatrivo-black-primary rounded-xl"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("back", { defaultValue: "Back" })}
          </Button>
        </motion.div>

        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-8 rounded-xl p-4 text-center text-sm font-medium ${
              toast.type === "success"
                ? "bg-eatrivo-green/10 text-eatrivo-green border border-eatrivo-green/20"
                : "bg-eatrivo-red/10 text-eatrivo-red border border-eatrivo-red/20"
            }`}
          >
            {toast.message}
          </motion.div>
        )}

        {/* Hero header */}
        <motion.div
          className="mb-14 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-eatrivo-black-primary md:text-5xl">
            {t("title")}
          </h1>
          <p className="mx-auto max-w-xl text-base text-eatrivo-black-secondary/80 leading-relaxed">
            {t("subtitle")}
          </p>
        </motion.div>

        {/* Cards grid */}
        <div className="mx-auto grid max-w-3xl gap-8 md:grid-cols-2 items-start">
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
        </div>

        {/* Trust footer */}
        <motion.div
          className="mt-14 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {status === "authenticated" &&
          (currentMembership === "premium" || currentMembership === "pro") ? (
            <Button
              onClick={handleManageSubscription}
              disabled={isManaging}
              className="rounded-xl border-2 border-eatrivo-purple/40 bg-eatrivo-white-primary hover:border-eatrivo-purple/80 text-eatrivo-black-secondary hover:text-eatrivo-black-primary"
            >
              {isManaging ? t("managingSubscription") : t("manageSubscription")}
            </Button>
          ) : (
            status !== "authenticated" && (
              <p className="text-sm text-eatrivo-black-secondary/60">
                {t("signInToUpgrade")}
              </p>
            )
          )}

          {/* Trust signals */}
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-eatrivo-black-secondary/50">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>
                {t("trustCancel", { defaultValue: "Cancel anytime" })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              <span>
                {t("trustSecure", { defaultValue: "Secure via Stripe" })}
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
