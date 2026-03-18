"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";
import {
  requestNotificationPermission,
  savePushSubscription,
  isPushNotificationSupported,
  syncPushSubscriptionToDB,
  subscribeUserToPush,
} from "@/lib/pwa/pushNotifications";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

const DISMISSED_KEY = "eatrivo-notif-banner-dismissed";
const SHOW_DELAY_MS = 2000; // Show after 2 seconds on page

export function NotificationBanner() {
  const { data: session } = useSession();
  const t = useTranslations("pwa.notifications");
  const [visible, setVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    if (typeof window === "undefined") return;
    if (!isPushNotificationSupported()) return;

    // Don't show if already dismissed this session
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    // If explicitly blocked — nothing we can do
    if (Notification.permission === "denied") return;

    if (Notification.permission === "granted") {
      // Permission granted before — silently sync subscription to DB (in case it was missed).
      // If the browser has no SW subscription (edge case: SW was disabled when they first accepted),
      // show the banner so they can re-subscribe.
      syncPushSubscriptionToDB().then((synced) => {
        if (!synced) {
          // SW subscription missing — ask user to re-enable
          const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
          // Store a ref cleanup isn't needed here since effect re-runs on session change only
          return () => clearTimeout(timer);
        }
      });
      return;
    }

    // permission === "default" — show banner after delay
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [session?.user?.id]);

  const handleEnable = async () => {
    if (!session?.user?.id) return;
    setIsLoading(true);
    setErrorMsg(null);

    console.log('[NotifBanner] handleEnable START');
    console.log('[NotifBanner] session.user.id:', session.user.id);
    console.log('[NotifBanner] Notification.permission:', Notification.permission);
    console.log('[NotifBanner] serviceWorker in navigator:', 'serviceWorker' in navigator);
    console.log('[NotifBanner] PushManager in window:', 'PushManager' in window);
    console.log('[NotifBanner] VAPID key present:', !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
    console.log('[NotifBanner] VAPID key (first 20 chars):', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.slice(0, 20) ?? 'MISSING');

    try {
      // If permission already granted, try to get/create SW subscription directly
      let subscription;
      if (Notification.permission === "granted") {
        console.log('[NotifBanner] Permission already granted — calling subscribeUserToPush()');
        subscription = await subscribeUserToPush();
      } else {
        console.log('[NotifBanner] Permission not yet granted — calling requestNotificationPermission()');
        subscription = await requestNotificationPermission();
      }

      console.log('[NotifBanner] subscription result:', subscription ? 'SUBSCRIPTION OBJECT' : 'NULL');
      if (subscription) {
        console.log('[NotifBanner] subscription.endpoint:', subscription.endpoint.slice(0, 80) + '...');
        const json = subscription.toJSON();
        console.log('[NotifBanner] subscription.keys.auth present:', !!json.keys?.auth);
        console.log('[NotifBanner] subscription.keys.p256dh present:', !!json.keys?.p256dh);

        console.log('[NotifBanner] Calling savePushSubscription()...');
        const result = await savePushSubscription(subscription);
        console.log('[NotifBanner] savePushSubscription() completed successfully');
        toast.success(result.status === "pending" ? t("pendingConfirmation") : t("enabled"));
        dismiss();
      } else {
        let msg: string;
        if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
          msg = "Push key not configured — contact support.";
        } else if (process.env.NODE_ENV === "development") {
          msg = "Service worker is disabled in dev mode. Set NEXT_PUBLIC_ENABLE_SW_DEV=true in .env.local and restart the server.";
        } else {
          msg = "Could not create subscription. Check the browser console for details, then try reloading the page.";
        }
        console.error('[NotifBanner] subscription is null. Derived error:', msg);
        setErrorMsg(msg);
        toast.error(t("enableError"));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[NotifBanner] CAUGHT ERROR:', err);
      console.error('[NotifBanner] Error message:', msg);
      console.error('[NotifBanner] Error stack:', err instanceof Error ? err.stack : 'N/A');
      if (msg.includes("SW_NOT_READY")) {
        setErrorMsg("Service worker timed out. Please reload the page and try again.");
      } else {
        setErrorMsg(`Save failed: ${msg}`);
      }
      toast.error(t("toggleError"));
    } finally {
      setIsLoading(false);
      console.log('[NotifBanner] handleEnable END');
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
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-200/60 p-4 flex flex-col gap-2.5">
            <div className="flex items-center gap-3">
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

              {/* Close */}
              <button
                onClick={dismiss}
                className="shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label={t("close")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error message */}
            {errorMsg && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 leading-snug">
                ⚠️ {errorMsg}
              </p>
            )}

            {/* Enable button */}
            <button
              onClick={handleEnable}
              disabled={isLoading}
              className="w-full px-3 py-2 text-xs font-bold text-white bg-eatrivo-purple hover:bg-eatrivo-purple/90 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
            >
              {isLoading ? "⏳ " + t("enable") + "..." : t("enable")}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
