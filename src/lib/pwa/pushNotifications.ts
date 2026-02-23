// src/lib/pwa/pushNotifications.ts
'use client';

// Public key can be exposed to client (not sensitive)
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.error('Tento prehliadač nepodporuje notifikácie');
    return null;
  }

  if (Notification.permission === 'granted') {
    return await subscribeUserToPush();
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      return await subscribeUserToPush();
    }
  }

  return null;
}

export async function subscribeUserToPush() {
  if (!('serviceWorker' in navigator)) {
    console.error('Service Worker nie je podporovaný');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      return existingSubscription;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.error('NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured');
      return null;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    return subscription;
  } catch (error) {
    console.error('Chyba pri subscribe:', error);
    return null;
  }
}

export async function savePushSubscription(subscription: PushSubscription, userId: string) {
  try {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription,
        userId,
      }),
    });

    if (!response.ok) {
      throw new Error('Nepodarilo sa uložiť subscription');
    }

    return await response.json();
  } catch (error) {
    console.error('Chyba pri ukladaní subscription:', error);
    throw error;
  }
}

export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Chyba pri unsubscribe:', error);
    return false;
  }
}

export function isPushNotificationSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}
