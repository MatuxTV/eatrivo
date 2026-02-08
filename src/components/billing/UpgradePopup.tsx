"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { X, Sparkles, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpgradePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpgradePopup({ isOpen, onClose }: UpgradePopupProps) {
  const [canClose, setCanClose] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("upgrade");

  useEffect(() => {
    if (!isOpen) return;

    // Start countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanClose(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpgrade = () => {
    onClose();
    router.push(`/${locale}/pricing`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
        {/* Close button */}
        {canClose ? (
          <button
            onClick={onClose}
            className="absolute -right-2 -top-2 z-10 rounded-full bg-gray-800 p-2 text-gray-400 transition hover:bg-gray-700 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <div className="absolute -right-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-sm font-medium text-gray-400">
            {countdown}
          </div>
        )}

        {/* Card */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-6 shadow-2xl ring-1 ring-white/10">
          {/* Icon */}
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-gradient-to-r from-amber-500 to-orange-500 p-3">
              <Crown className="h-8 w-8 text-white" />
            </div>
          </div>

          {/* Content */}
          <h2 className="mb-2 text-center text-2xl font-bold text-white">
            {t("title")}
          </h2>
          <p className="mb-6 text-center text-gray-400">{t("description")}</p>

          {/* Features */}
          <ul className="mb-6 space-y-3">
            {["feature1", "feature2", "feature3"].map((key) => (
              <li key={key} className="flex items-center gap-3 text-gray-300">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>

          {/* CTA Button */}
          <Button
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 py-6 text-lg font-semibold text-white transition hover:from-amber-600 hover:to-orange-600"
          >
            {t("upgradeButton")}
          </Button>

          {/* Skip text */}
          {canClose && (
            <button
              onClick={onClose}
              className="mt-4 w-full text-center text-sm text-gray-500 transition hover:text-gray-400"
            >
              {t("maybeLater")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
