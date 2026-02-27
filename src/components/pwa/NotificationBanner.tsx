"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";
import {
  requestNotificationPermission,
  savePushSubscription,
  isPushNotificationSupported,
} from "@/lib/pwa/pushNotifications";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

const DISMISSED_KEY = "eatrivo-notif-banner-dismissed";
const SHOW_DELAY_MS = 8000; // Show after 8 seconds on page

export function NotificationBanner() {
  const { data: session } = useSession();
  const t = useTranslations("pwa.notifications");
  const [visible, setVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;
    if (typeof window === "undefined") return;
    if (!isPushNotificationSupported()) return;

    // Don't show if already dismissed this session
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    // Don't show if permission was explicitly denied
    if (Notification.permission === "denied") return;

    // If already granted, user is subscribed — don't show
    if (Notification.permission === "granted") return;

    // Show after delay (no need to check subscription for "default" permission)
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [session?.user?.id]);

  const handleEnable = async () => {
    if (!session?.user?.id) return;
    setIsLoading(true);

    try {
      const subscription = await requestNotificationPermission();
      if (subscription) {
        await savePushSubscription(subscription, session.user.id);
        toast.success(t("enabled"));
        dismiss();
      } else {
        toast.error(t("enableError"));
      }
    } catch {
      toast.error(t("toggleError"));
    } finally {
      setIsLoading(false);
    }
  };

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem(DISMISSED_KEY, "1");
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[360px] z-[60]"
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-200/60 p-4 flex items-center gap-3">
            {/* Icon */}
            <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-eatrivo-purple to-eatrivo-pink flex items-center justify-center shadow-md shadow-eatrivo-purple/20">
              <Bell className="w-5 h-5 text-white" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 leading-tight">
                {t("title")}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">
                {t("bannerDescription")}
              </p>
            </div>

            {/* Actions */}
            <div className="shrink-0 flex items-center gap-1.5">
              <button
                onClick={handleEnable}
                disabled={isLoading}
                className="px-3 py-1.5 text-xs font-bold text-white bg-eatrivo-purple hover:bg-eatrivo-purple/90 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
              >
                {isLoading ? "..." : t("enable")}
              </button>
              <button
                onClick={dismiss}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label={t("close")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
