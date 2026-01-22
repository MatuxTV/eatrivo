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
  const [selectedPlatform, setSelectedPlatform] = useState<'ios' | 'android' | null>(null);
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
    // For Android with native prompt
    if (installPrompt && selectedPlatform === 'android') {
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
    }
    // For iOS or when no native prompt available, show instructions
    else if (selectedPlatform === 'ios') {
      // Instructions are already visible, just show toast
      toast.info(t('followInstructions'));
    }
  };

  const handleDismiss = async () => {
    if (!session?.user?.id) {
      setShowPrompt(false);
      setSelectedPlatform(null);
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
      setSelectedPlatform(null);
      
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

  const handleBack = () => {
    setSelectedPlatform(null);
  };

  // Don't render on server or before mount
  if (!mounted || !showPrompt) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in duration-300"
        onClick={handleDismiss}
      />
      
      {/* Popup container */}
      <div className="fixed inset-x-0 bottom-0 z-[101] animate-in slide-in-from-bottom duration-500">
        <div className="bg-eatrivo-purple bg-opacity-90 text-white rounded-t-3xl shadow-2xl max-w-2xl mx-auto">
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
            {!selectedPlatform ? (
              // Platform Selection View
              <>
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
                <div className="text-center mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold mb-3">
                    {t('title')}
                  </h2>
                  <p className="text-base sm:text-lg text-white/90">
                    {t('selectPlatform')}
                  </p>
                </div>

                {/* Platform Selection */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* iOS Button */}
                  <button
                    onClick={() => setSelectedPlatform('ios')}
                    className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-2xl p-6 text-center transition-all duration-200 border-2 border-white/20 hover:border-white/40"
                  >
                    <div className="w-16 h-16 mx-auto mb-3 bg-white/20 rounded-2xl flex items-center justify-center">
                      <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                      </svg>
                    </div>
                    <p className="font-bold text-lg mb-1">iOS</p>
                    <p className="text-xs text-white/70">iPhone / iPad</p>
                  </button>

                  {/* Android Button */}
                  <button
                    onClick={() => setSelectedPlatform('android')}
                    className="bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-2xl p-6 text-center transition-all duration-200 border-2 border-white/20 hover:border-white/40"
                  >
                    <div className="w-16 h-16 mx-auto mb-3 bg-white/20 rounded-2xl flex items-center justify-center">
                      <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a11.46 11.46 0 0 0-8.94 0L5.65 5.67c-.19-.28-.54-.37-.83-.22-.3.16-.42.54-.26.85l1.84 3.18C4.8 10.79 3.6 12.87 3.6 15.3c0 .1 0 .2.01.3h16.78c.01-.1.01-.2.01-.3 0-2.43-1.2-4.51-2.8-5.82zM7 13.75c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm10 0c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/>
                      </svg>
                    </div>
                    <p className="font-bold text-lg mb-1">Android</p>
                    <p className="text-xs text-white/70">All devices</p>
                  </button>
                </div>

                {/* Never show again checkbox */}
                <div className="mt-6 pt-4 border-t border-white/20">
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
              </>
            ) : (
              // Instructions View
              <>
                {/* Back button */}
                <button
                  onClick={handleBack}
                  className="mb-4 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="text-sm">{t('back')}</span>
                </button>

                {/* Platform specific instructions */}
                {selectedPlatform === 'ios' ? (
                  // iOS Instructions
                  <>
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-2xl flex items-center justify-center">
                        <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold mb-2">{t('ios.title')}</h3>
                      <p className="text-white/80 text-sm">{t('ios.description')}</p>
                    </div>

                    <div className="space-y-4 mb-6">
                      <div className="bg-white/10 rounded-xl p-4 flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">1</div>
                        <div>
                          <p className="font-medium mb-1">{t('ios.step1')}</p>
                          <div className="flex items-center gap-2 text-white/70 text-sm">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/>
                            </svg>
                            <span>Share icon</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/10 rounded-xl p-4 flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">2</div>
                        <div>
                          <p className="font-medium">{t('ios.step2')}</p>
                        </div>
                      </div>

                      <div className="bg-white/10 rounded-xl p-4 flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">3</div>
                        <div>
                          <p className="font-medium">{t('ios.step3')}</p>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleDismiss}
                      className="w-full h-12 bg-white text-eatrivo-purple hover:bg-white/90 font-bold text-lg shadow-lg"
                    >
                      {t('gotIt')}
                    </Button>
                  </>
                ) : (
                  // Android Instructions
                  <>
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-2xl flex items-center justify-center">
                        <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85-.29-.15-.65-.06-.83.22l-1.88 3.24a11.46 11.46 0 0 0-8.94 0L5.65 5.67c-.19-.28-.54-.37-.83-.22-.3.16-.42.54-.26.85l1.84 3.18C4.8 10.79 3.6 12.87 3.6 15.3c0 .1 0 .2.01.3h16.78c.01-.1.01-.2.01-.3 0-2.43-1.2-4.51-2.8-5.82zM7 13.75c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm10 0c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25z"/>
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold mb-2">{t('android.title')}</h3>
                      <p className="text-white/80 text-sm">{t('android.description')}</p>
                    </div>

                    {installPrompt ? (
                      // Has native prompt
                      <>
                        <div className="bg-white/10 rounded-xl p-6 mb-6 text-center">
                          <Download className="w-12 h-12 mx-auto mb-3" />
                          <p className="text-white/90">{t('android.clickBelow')}</p>
                        </div>

                        <Button
                          onClick={handleInstall}
                          disabled={isLoading}
                          className="w-full h-12 bg-white text-eatrivo-purple hover:bg-white/90 font-bold text-lg shadow-lg mb-3"
                        >
                          {t('installNow')}
                        </Button>
                      </>
                    ) : (
                      // Manual instructions
                      <>
                        <div className="space-y-4 mb-6">
                          <div className="bg-white/10 rounded-xl p-4 flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">1</div>
                            <div>
                              <p className="font-medium">{t('android.step1')}</p>
                            </div>
                          </div>

                          <div className="bg-white/10 rounded-xl p-4 flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">2</div>
                            <div>
                              <p className="font-medium">{t('android.step2')}</p>
                            </div>
                          </div>

                          <div className="bg-white/10 rounded-xl p-4 flex gap-4">
                            <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">3</div>
                            <div>
                              <p className="font-medium">{t('android.step3')}</p>
                            </div>
                          </div>
                        </div>

                        <Button
                          onClick={handleDismiss}
                          className="w-full h-12 bg-white text-eatrivo-purple hover:bg-white/90 font-bold text-lg shadow-lg"
                        >
                          {t('gotIt')}
                        </Button>
                      </>
                    )}

                    <Button
                      onClick={handleDismiss}
                      disabled={isLoading}
                      variant="ghost"
                      className="w-full text-white hover:bg-white/10 mt-2"
                    >
                      {t('maybeLater')}
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
