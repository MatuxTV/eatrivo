'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Download, X, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

// Type definition for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAInstallPrompt() {
  const { data: session } = useSession();
  const t = useTranslations('pwa.installPrompt');
  const [mounted, setMounted] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [neverShowAgain, setNeverShowAgain] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Check if user preference exists in DB
    const checkUserPreference = async () => {
      if (!session?.user?.hideInstallPrompt) {
        return false;
      }
      return session.user.hideInstallPrompt;
    };

    const handler = async (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      
      // Check if user has hidden this prompt permanently
      const shouldHide = await checkUserPreference();
      if (!shouldHide) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowPrompt(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [session]);

  const handleInstall = async () => {
    if (!installPrompt) return;

    try {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;

      if (outcome === 'accepted') {
        setShowPrompt(false);
        setInstallPrompt(null);
        toast.success(t('thankYou'));
      }
    } catch (error) {
      console.error('Install prompt error:', error);
    }
  };

  const handleDismiss = async () => {
    if (!session?.user?.id) {
      setShowPrompt(false);
      return;
    }

    setIsLoading(true);

    try {
      // Save preference to database
      const response = await fetch('/api/user/pwa-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hideInstallPrompt: neverShowAgain,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save preference');
      }

      setShowPrompt(false);
      
      if (neverShowAgain) {
        toast.success(t('preferenceSaved'));
      }
    } catch (error) {
      console.error('Error saving preference:', error);
      toast.error(t('preferenceError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render on server or before mount
  if (!mounted || !showPrompt || !installPrompt) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in duration-300"
        onClick={handleDismiss}
      />
      
      {/* Popup container */}
      <div className="fixed inset-x-0 bottom-0 z-[101] animate-in slide-in-from-bottom duration-500">
        <div className=" bg-eatrivo-purple bg-opacity-90 text-white rounded-t-3xl shadow-2xl max-w-2xl mx-auto">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            disabled={isLoading}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="p-6 sm:p-8 pb-safe">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-white/30 rounded-full blur-xl animate-pulse" />
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <Smartphone className="w-10 h-10 sm:w-12 sm:h-12 text-eatrivo-purple" />
                </div>
              </div>
            </div>

            {/* Title & Description */}
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                {t('title')}
              </h2>
              <p className="text-base sm:text-lg text-white/90 mb-4">
                {t('description')}
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <Download className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium">{t('features.offline')}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-sm font-medium">{t('features.faster')}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="text-sm font-medium">{t('features.notifications')}</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleInstall}
                disabled={isLoading}
                className="w-full h-12 bg-white text-eatrivo-purple hover:bg-white/90 font-bold text-lg shadow-lg"
              >
                {t('installNow')}
              </Button>
              
              <Button
                onClick={handleDismiss}
                disabled={isLoading}
                variant="ghost"
                className="w-full text-white hover:bg-white/10"
              >
                {t('maybeLater')}
              </Button>
            </div>

            {/* Never show again checkbox */}
            <div className="mt-4 pt-4 border-t border-white/20">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={neverShowAgain}
                  onChange={(e) => setNeverShowAgain(e.target.checked)}
                  disabled={isLoading}
                  className="w-5 h-5 rounded border-2 border-white/50 bg-white/10 checked:bg-white checked:border-white focus:ring-2 focus:ring-white/50 transition-all cursor-pointer"
                />
                <span className="text-sm text-white/80 group-hover:text-white transition-colors">
                  {t('neverShow')}
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
