// src/lib/pwa/pushNotifications.ts
"use client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const SW_READY_TIMEOUT_MS = 10_000;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i)
    outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

/** Wraps navigator.serviceWorker.ready with a timeout so it never hangs forever. */
async function getReadyRegistration(): Promise<ServiceWorkerRegistration> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new Error(
          `SW_NOT_READY: Service worker did not become active within ${SW_READY_TIMEOUT_MS / 1000}s. ` +
            "Try reloading the page or clearing site data.",
        ),
      );
    }, SW_READY_TIMEOUT_MS);

    navigator.serviceWorker.ready
      .then((reg) => {
        clearTimeout(timeout);
        resolve(reg);
      })
      .catch((err) => {
        clearTimeout(timeout);
        reject(err);
      });
  });
}

export async function requestNotificationPermission(): Promise<PushSubscription | null> {
  console.log("[Push] requestNotificationPermission() called");
  if (!("Notification" in window)) {
    console.error("[Push] Browser does not support notifications");
    return null;
  }

  console.log(
    "[Push] Current Notification.permission:",
    Notification.permission,
  );

  if (Notification.permission === "granted") {
    console.log("[Push] Already granted — delegating to subscribeUserToPush()");
    return subscribeUserToPush();
  }

  if (Notification.permission === "denied") {
    console.warn(
      "[Push] Permission denied — user must unblock in browser settings",
    );
    return null;
  }

  console.log("[Push] Requesting permission from browser...");
  const permission = await Notification.requestPermission();
  console.log("[Push] Permission response:", permission);
  if (permission === "granted") return subscribeUserToPush();
  console.warn("[Push] Permission not granted, result was:", permission);
  return null;
}

export async function subscribeUserToPush(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) {
    console.error("[Push] Service Worker API not available");
    return null;
  }

  if (!VAPID_PUBLIC_KEY) {
    console.error(
      "[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing � check env vars",
    );
    return null;
  }

  let registration: ServiceWorkerRegistration;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    console.log("[Push] Current SW registrations count:", regs.length);
    regs.forEach((r, i) => {
      console.log(
        `[Push] SW[${i}] scope:`,
        r.scope,
        "| active:",
        r.active?.state ?? "none",
        "| installing:",
        r.installing?.state ?? "none",
        "| waiting:",
        r.waiting?.state ?? "none",
      );
    });

    // If no SW is registered at all, try to register sw.js manually.
    // This happens when next-pwa auto-registration didn't run (e.g. dev mode,
    // first-load race condition, or the injected script failed silently).
    if (regs.length === 0) {
      console.warn(
        "[Push] No SW registered — attempting manual registration of /sw.js...",
      );
      try {
        const manualReg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        console.log(
          "[Push] Manual SW registration succeeded. State:",
          manualReg.active?.state ?? "installing…",
        );
      } catch (regErr) {
        console.error("[Push] Manual SW registration failed:", regErr);
        console.error(
          "[Push] Make sure /sw.js exists in your public folder. " +
            "Run a production build (next build) or set NEXT_PUBLIC_ENABLE_SW_DEV=true in .env.local to enable SW in dev.",
        );
        return null;
      }
    }

    console.log("[Push] Waiting for SW to be ready (max 10s)...");
    registration = await getReadyRegistration();
    console.log("[Push] SW ready. Scope:", registration.scope);
    console.log(
      "[Push] SW active state:",
      registration.active?.state ?? "none",
    );
    console.log(
      "[Push] SW active scriptURL:",
      registration.active?.scriptURL ?? "none",
    );
  } catch (err) {
    console.error("[Push] SW ready failed:", err);
    return null;
  }

  // Check existing subscription
  let existing: PushSubscription | null = null;
  try {
    existing = await registration.pushManager.getSubscription();
  } catch (err) {
    console.warn("[Push] getSubscription() error:", err);
  }

  if (existing) {
    console.log(
      "[Push] Existing subscription found:",
      existing.endpoint.slice(0, 60) + "...",
    );
    return existing;
  }

  // Create new subscription
  console.log("[Push] Creating new push subscription...");
  console.log("[Push] VAPID key length:", VAPID_PUBLIC_KEY.length);
  let applicationServerKey: Uint8Array;
  try {
    applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    console.log(
      "[Push] VAPID key decoded to Uint8Array, length:",
      applicationServerKey.length,
      "(expected 65)",
    );
  } catch (keyErr) {
    console.error("[Push] VAPID key decode failed:", keyErr);
    return null;
  }
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      applicationServerKey: applicationServerKey as any,
    });
    console.log("[Push] Subscription created successfully");
    console.log("[Push] endpoint:", subscription.endpoint.slice(0, 80) + "...");
    const subJson = subscription.toJSON();
    console.log("[Push] keys.auth present:", !!subJson.keys?.auth);
    console.log("[Push] keys.p256dh present:", !!subJson.keys?.p256dh);
    return subscription;
  } catch (err) {
    const errMsg = String(err);
    // Key mismatch: existing sub was created with different VAPID key — unsubscribe and retry
    if (
      errMsg.includes("applicationServerKey") ||
      errMsg.includes("different application server key")
    ) {
      console.warn(
        "[Push] VAPID key mismatch — unsubscribing stale subscription and retrying...",
      );
      try {
        const staleSub = await registration.pushManager.getSubscription();
        if (staleSub) await staleSub.unsubscribe();
        const fresh = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as any,
        });
        console.log(
          "[Push] ? Re-subscribed after key mismatch:",
          fresh.endpoint.slice(0, 60) + "...",
        );
        return fresh;
      } catch (retryErr) {
        console.error("[Push] Retry after key mismatch failed:", retryErr);
        return null;
      }
    }
    console.error("[Push] pushManager.subscribe() failed:", err);
    return null;
  }
}

export async function savePushSubscription(
  subscription: PushSubscription,
): Promise<{ status: "pending" | "confirmed"; message: string }> {
  console.log("[Push] Saving subscription to DB...");
  const payload = subscription.toJSON();
  const locale = typeof document !== "undefined" ? document.documentElement.lang : "sk";
  console.log(
    "[Push] Payload endpoint:",
    (payload.endpoint ?? "").slice(0, 60) + "...",
  );
  console.log(
    "[Push] Has keys:",
    !!(payload.keys?.auth && payload.keys?.p256dh),
  );

  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: payload, locale }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("[Push] ? DB save failed:", response.status, data);
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  console.log("[Push] ? Saved to DB:", data.message);
  return {
    status: data.status === "confirmed" ? "confirmed" : "pending",
    message: typeof data.message === "string" ? data.message : "OK",
  };
}

/**
 * Silently syncs an existing browser subscription to DB on page load.
 * Returns true if successfully synced, false if nothing to sync.
 */
export async function syncPushSubscriptionToDB(): Promise<boolean> {
  if (!isPushNotificationSupported()) return false;
  if (typeof Notification === "undefined") return false;
  if (Notification.permission !== "granted") return false;

  try {
    const registration = await getReadyRegistration();
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      console.log(
        "[Push] Sync: permission granted but no SW subscription exists",
      );
      return false;
    }
    await savePushSubscription(subscription);
    return true;
  } catch (err) {
    // Silent � don't crash the page
    console.warn("[Push] Background sync failed (non-fatal):", err);
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  try {
    const registration = await getReadyRegistration();
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return false;
    await subscription.unsubscribe();
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    return true;
  } catch (err) {
    console.error("[Push] unsubscribe failed:", err);
    return false;
  }
}

export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}
