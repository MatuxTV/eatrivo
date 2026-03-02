'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { requestNotificationPermission, savePushSubscription, isPushNotificationSupported, syncPushSubscriptionToDB } from '@/lib/pwa/pushNotifications';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

export function PushNotificationToggle() {
  const { data: session } = useSession();
  const t = useTranslations('pwa.notifications');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(isPushNotificationSupported());
    
    if (isPushNotificationSupported() && session?.user?.id) {
      checkSubscriptionStatus();
      // Silently sync subscription to DB on mount — covers the case where
      // permission was granted but the DB record was never saved
      syncPushSubscriptionToDB().catch(() => {});
    }
  }, [session]);

  const checkSubscriptionStatus = async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const handleToggleNotifications = async () => {
    if (!session?.user?.id) {
      toast.error(t('loginRequired'));
      return;
    }

    setIsLoading(true);

    try {
      if (isSubscribed) {
        // Unsubscribe
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          
          if (subscription) {
            await subscription.unsubscribe();
            setIsSubscribed(false);
            toast.success(t('disabled'));
          }
        }
      } else {
        // Subscribe
        const subscription = await requestNotificationPermission();
        
        if (subscription) {
          await savePushSubscription(subscription);
          setIsSubscribed(true);
          toast.success(t('enabled'));
        } else {
          toast.error(t('enableError'));
        }
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      toast.error(t('toggleError'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported || !session) {
    return null;
  }

  return (
    <Button
      onClick={handleToggleNotifications}
      disabled={isLoading}
      variant={isSubscribed ? 'outline' : 'default'}
      className="flex items-center gap-2"
    >
      {isSubscribed ? (
        <>
          <BellOff className="w-4 h-4" />
          {t('disable')}
        </>
      ) : (
        <>
          <Bell className="w-4 h-4" />
          {t('enable')}
        </>
      )}
    </Button>
  );
}
