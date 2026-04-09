"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import type { Locale } from "@/i18n/routing";

type IntroFeatureSlide = {
  eyebrow: string;
  title: string;
  description: string;
};

type SignInIntroCarouselProps = {
  locale: Locale;
  logoAlt: string;
  headlineTop: string;
  headlineBottom: string;
  subtitle: string;
  illustrationAlt: string;
  continueLabel: string;
  skipLabel: string;
  swipeHint: string;
  googleButtonLabel: string;
  termsLabel: string;
  andLabel: string;
  privacyLabel: string;
  agreementPrefix: string;
  introSlide: IntroFeatureSlide;
  customRecipesSlide: IntroFeatureSlide;
  pantrySlide: IntroFeatureSlide;
  googleAction: () => void | Promise<void>;
};

type SlideDefinition = {
  key: "intro" | "customRecipes" | "pantry" | "signin";
  eyebrow: string;
  title: string;
  description: string;
  screenshotSrc?: string;
};

const localeScreenshots: Record<Locale, string[]> = {
  sk: [
    "/images/screenshots/sk/SCREEN_HOME.jpg",
    "/images/screenshots/sk/SCREEN_PANTRY.jpg",
    "/images/screenshots/sk/SCREEN_CHAT_W_RIVO.jpg",
  ],
  en: [
    "/images/screenshots/en/SCREEN_HOME.jpeg",
    "/images/screenshots/en/SCREEN_PANTRY.jpeg",
    "/images/screenshots/en/CHAT_W_RIVO.jpeg",
  ],
};

const slideVariants = {
  initial: (direction: 1 | -1) => ({
    opacity: 0,
    x: direction === 1 ? 56 : -56,
    scale: 0.985,
  }),
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
  },
  exit: (direction: 1 | -1) => ({
    opacity: 0,
    x: direction === 1 ? -56 : 56,
    scale: 0.985,
  }),
};

function shuffleArray(items: string[]) {
  const nextItems = [...items];

  for (let index = nextItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextItems[index], nextItems[swapIndex]] = [nextItems[swapIndex], nextItems[index]];
  }

  return nextItems;
}

function FeaturePhoneMockup({ screenshotSrc, alt }: { screenshotSrc: string; alt: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[19.5rem] px-1">
      <div className="absolute left-4 top-4 h-16 w-16 rounded-full bg-[#ead8ff] blur-2xl" />
      <div className="absolute bottom-8 right-0 h-24 w-24 rounded-full bg-[#ffd9e7] blur-3xl" />

      <div className="relative mx-auto aspect-[129/236] w-[14.65rem] rounded-[3rem] border-[5px] border-[#2f2a36] bg-[#18141f] p-[0.4rem] shadow-[0_32px_90px_rgba(49,33,72,0.28)]">
        <div className="absolute left-1/2 top-[0.62rem] z-20 flex h-[1.06rem] w-[4.18rem] -translate-x-1/2 items-center justify-center gap-[0.28rem] rounded-full bg-[#221d28] shadow-[0_8px_18px_rgba(0,0,0,0.24)]">
          <div className="h-[0.34rem] w-[0.34rem] rounded-full bg-[#0d0a11] opacity-95" />
          <div className="h-[0.24rem] w-[0.24rem] rounded-full bg-[#3c3744]" />
        </div>
        <div className="relative h-full overflow-hidden rounded-[2.2rem] bg-white">
          <Image
            src={screenshotSrc}
            alt={alt}
            fill
            priority
            className="object-cover object-top"
            sizes="220px"
          />
          <div className="absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-b from-transparent via-white/12 to-white/90" />
          <div className="absolute inset-x-0 bottom-0 h-[2.1rem] bg-white/55 backdrop-blur-[2px]" />
          <div className="absolute bottom-[0.7rem] left-1/2 h-1 w-[4.5rem] -translate-x-1/2 rounded-full bg-black/12" />
        </div>
      </div>
    </div>
  );
}

function IntroDevicePreview({
  slideKey,
  screenshotSrc,
  alt,
}: {
  slideKey: SlideDefinition["key"];
  screenshotSrc?: string;
  alt: string;
}) {
  if (screenshotSrc && slideKey !== "signin") {
    return <FeaturePhoneMockup screenshotSrc={screenshotSrc} alt={alt} />;
  }

  if (slideKey === "signin") {
    return (
      <div className="relative mx-auto flex h-[22.5rem] w-full max-w-[17rem] items-center justify-center overflow-hidden rounded-[2.5rem] ">
        <div className="absolute bottom-6 right-5 " />
        <Image
          src="/rivo/RIVO7-login.png"
          alt={"Rivo"}
          width={400}
          height={280}
          priority
          className="relative h-auto w-[20.75rem]"
        />
      </div>
    );
  }

  return (
    <div className="relative mx-auto flex h-[22.5rem] w-full max-w-[17rem] flex-col overflow-hidden rounded-[2.5rem] bg-[linear-gradient(180deg,#fff9ff_0%,#f6ecff_100%)] px-4 pb-4 pt-5 shadow-[0_25px_70px_rgba(135,87,197,0.18)]">
      <div className="absolute left-3 top-4 h-14 w-14 rounded-full bg-[#ead8ff] blur-2xl" />
      <div className="absolute bottom-4 right-2 h-24 w-24 rounded-full bg-[#ffd9e7] blur-3xl" />
      <div className="relative rounded-[1.8rem] bg-white/90 p-4 shadow-[0_18px_40px_rgba(83,56,120,0.08)]">
        <div className="flex items-center justify-between">
          <div className="h-3 w-10 rounded-full bg-[#e4d9f3]" />
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-[#e5dfeb]" />
            <div className="h-3 w-3 rounded-full bg-[#e5dfeb]" />
          </div>
        </div>
        <div className="mt-5 h-4 w-20 rounded-full bg-[#d9c0ff]" />
        <div className="mt-5 space-y-3">
          {["#ddd0ff", "#ffd7e7", "#f3eaff"].map((color, index) => (
            <div key={index} className="flex items-center gap-3 rounded-[1.3rem] bg-[#fffdfa] px-3 py-3 shadow-[0_10px_24px_rgba(88,61,121,0.05)]">
              <div className="h-12 w-12 rounded-full" style={{ backgroundColor: color }} />
              <div className="flex-1 space-y-2">
                <div className="h-2.5 w-20 rounded-full bg-[#d5cfde]" />
                <div className="h-2 w-12 rounded-full bg-[#ece7f3]" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-auto flex justify-center pb-2">
        <div className="h-1.5 w-16 rounded-full bg-[#d7cde6]" />
      </div>
    </div>
  );
}

export function SignInIntroCarousel({
  locale,
  logoAlt,
  headlineTop,
  headlineBottom,
  subtitle,
  illustrationAlt,
  continueLabel,
  skipLabel,
  swipeHint,
  googleButtonLabel,
  termsLabel,
  andLabel,
  privacyLabel,
  agreementPrefix,
  introSlide,
  customRecipesSlide,
  pantrySlide,
  googleAction,
}: SignInIntroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const touchStartRef = useRef<number | null>(null);
  const [featureScreenshots, setFeatureScreenshots] = useState<string[]>(() => localeScreenshots[locale]);

  useEffect(() => {
    setFeatureScreenshots(shuffleArray(localeScreenshots[locale]));
  }, [locale]);

  const slides = useMemo<SlideDefinition[]>(
    () => [
      {
        key: "intro",
        eyebrow: introSlide.eyebrow,
        title: introSlide.title,
        description: introSlide.description,
        screenshotSrc: featureScreenshots[0],
      },
      {
        key: "customRecipes",
        eyebrow: customRecipesSlide.eyebrow,
        title: customRecipesSlide.title,
        description: customRecipesSlide.description,
        screenshotSrc: featureScreenshots[1],
      },
      {
        key: "pantry",
        eyebrow: pantrySlide.eyebrow,
        title: pantrySlide.title,
        description: pantrySlide.description,
        screenshotSrc: featureScreenshots[2],
      },
      {
        key: "signin",
        eyebrow: "",
        title: `${headlineTop}\n${headlineBottom}`,
        description: subtitle,
      },
    ],
    [customRecipesSlide, featureScreenshots, headlineBottom, headlineTop, introSlide, pantrySlide, subtitle],
  );

  const currentSlide = slides[currentIndex];
  const isFinalSlide = currentSlide.key === "signin";
  const hasFeaturePreview = Boolean(currentSlide.screenshotSrc);

  const goToStep = (nextIndex: number) => {
    if (nextIndex === currentIndex || nextIndex < 0 || nextIndex >= slides.length) {
      return;
    }

    setDirection(nextIndex > currentIndex ? 1 : -1);
    setCurrentIndex(nextIndex);
  };

  const handleNext = () => {
    if (!isFinalSlide) {
      goToStep(currentIndex + 1);
    }
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartRef.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const startX = touchStartRef.current;
    const endX = event.changedTouches[0]?.clientX;

    touchStartRef.current = null;

    if (startX === null || typeof endX !== "number") {
      return;
    }

    const deltaX = endX - startX;
    if (Math.abs(deltaX) < 40) {
      return;
    }

    if (deltaX < 0 && currentIndex < slides.length - 1) {
      goToStep(currentIndex + 1);
    }

    if (deltaX > 0 && currentIndex > 0) {
      goToStep(currentIndex - 1);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top,#fffafc_0%,#f7efff_44%,#f6edff_100%)] px-3 py-3 sm:px-4 sm:py-4">
      <div className="pointer-events-none absolute left-1/2 top-[-4.5rem] h-56 w-56 -translate-x-1/2 rounded-full bg-[#ead7ff] opacity-75 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-3rem] left-[-2rem] h-44 w-44 rounded-full bg-[#ffdcea] opacity-80 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[20%] right-[-2rem] h-48 w-48 rounded-full bg-[#efe3ff] opacity-80 blur-3xl" />

      <div className="relative bg-eatrivo-white-primary rounded-2xl mx-auto flex min-h-[calc(100dvh-1.5rem)] w-full max-w-[25rem] flex-col  px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:min-h-[46rem] sm:px-6 sm:pt-5">
        <header className="relative flex items-center justify-between">
          <div className="flex items-center gap-2 rounded-full px-2.5 py-1.5  ">
            <Image
              src="/logo/LOGO_ROW.png"
              alt={logoAlt}
              width={120}
              height={30}
              priority
              className="h-auto w-[6.9rem]"
            />
          </div>

         

          {isFinalSlide ? (
            null
          ) : (
            <button
              type="button"
              onClick={() => goToStep(slides.length - 1)}
              className="rounded-full bg-white/78 px-3 py-1.5 text-sm font-semibold text-eatrivo-purple shadow-sm ring-1 ring-white/80 transition-transform duration-200 active:scale-95"
            >
              {skipLabel}
            </button>
          )}
        </header>

        <div
          className="mt-5 flex flex-1 flex-col"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={currentSlide.key}
              custom={direction}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className={`flex flex-1 flex-col ${hasFeaturePreview ? "justify-center" : "justify-center"}`}
            >
              <div className={`relative z-0 mx-auto w-full ${hasFeaturePreview ? "-mb-28 pt-0" : "flex justify-center"}`}>
                <IntroDevicePreview
                  slideKey={currentSlide.key}
                  screenshotSrc={currentSlide.screenshotSrc}
                  alt={`${currentSlide.title} preview`}
                />
              </div>

              <div className={`relative mx-auto w-full max-w-[22rem] overflow-hidden rounded-[2.25rem] px-4 py-6 text-center shadow-[0_20px_55px_rgba(121,78,171,0.1)] ${hasFeaturePreview ? "-mt-8 pt-10" : "mt-6"}`}>
                {currentSlide.screenshotSrc ? (
                  <>
                    <div className="absolute left-1/2 top-[-11.9rem] h-[calc(100%+13rem)] w-[15rem] -translate-x-1/2 rounded-[2.85rem] bg-[#251f2c]/12 blur-[1px]" />
                    <div className="absolute left-1/2 top-[-11.5rem] h-[calc(100%+12.35rem)] w-[14.25rem] -translate-x-1/2 overflow-hidden rounded-[2.5rem]">
                      <Image
                        src={currentSlide.screenshotSrc}
                        alt=""
                        fill
                        sizes="240px"
                        className="scale-[1.06] object-cover object-bottom opacity-52 blur-xl"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,251,255,0.06)_20%,rgba(255,248,255,0.62)_52%,rgba(255,247,255,0.98)_100%)]" />
                    </div>
                    <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
                      <Image
                        src={currentSlide.screenshotSrc}
                        alt=""
                        fill
                        sizes="400px"
                        className="scale-[1.06] object-cover object-bottom opacity-28 blur-2xl"
                      />
                    </div>
                    <div className="absolute inset-0 rounded-[2.25rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.52)_0%,rgba(255,250,255,0.86)_34%,rgba(255,247,255,0.98)_100%)] backdrop-blur-xl" />
                  </>
                ) : null}

                <div className="relative z-10 flex flex-col items-center justify-center">
                {currentSlide.eyebrow ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/72 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[#7d49cf] shadow-sm ring-1 ring-white/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#7d49cf]" />
                    {currentSlide.eyebrow}
                  </div>
                ) : null}

                <h1 className="mx-auto mt-4 max-w-[18.75rem] whitespace-pre-line text-[2.35rem] font-black leading-[0.93] tracking-[-0.06em] text-[#2e1848] sm:text-[2.55rem]">
                  {currentSlide.title}
                </h1>
                <p className="mx-auto mt-4 max-w-[18.75rem] text-[1.02rem] font-medium leading-7 text-[#6f6383] sm:max-w-[19.5rem]">
                  {currentSlide.description}
                </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-auto pt-7">
            {isFinalSlide ? (
              <>
                <form action={googleAction}>
                  <button
                    type="submit"
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-full border border-white/80 bg-white px-5 text-sm font-bold text-[#262231] shadow-[0_16px_35px_rgba(78,55,118,0.12)] transition-all duration-200 hover:translate-y-[-1px] active:scale-[0.98]"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                      <path fill="#4285F4" d="M21.6 12.23c0-.68-.06-1.33-.18-1.95H12v3.69h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.24c1.9-1.75 2.98-4.33 2.98-7.26Z" />
                      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.43l-3.24-2.5c-.9.6-2.05.96-3.37.96-2.59 0-4.79-1.75-5.57-4.1H3.09v2.58A9.98 9.98 0 0 0 12 22Z" />
                      <path fill="#FBBC05" d="M6.43 13.93A5.98 5.98 0 0 1 6.1 12c0-.67.12-1.32.33-1.93V7.5H3.09A9.98 9.98 0 0 0 2 12c0 1.61.39 3.14 1.09 4.5l3.34-2.57Z" />
                      <path fill="#EA4335" d="M12 5.96c1.47 0 2.78.5 3.81 1.48l2.86-2.86C16.95 2.98 14.69 2 12 2A9.98 9.98 0 0 0 3.09 7.5l3.34 2.57c.78-2.35 2.98-4.11 5.57-4.11Z" />
                    </svg>
                    {googleButtonLabel}
                  </button>
                </form>

                <p className="mx-auto mt-4 max-w-[18rem] text-center text-[11px] leading-5 text-[#948ca3]">
                  {agreementPrefix}{" "}
                  <Link href={`/${locale}/terms-of-service`} className="font-semibold text-[#5f3db2] underline underline-offset-2">
                    {termsLabel}
                  </Link>{" "}
                  {andLabel}{" "}
                  <Link href={`/${locale}/privacy-policy`} className="font-semibold text-[#5f3db2] underline underline-offset-2">
                    {privacyLabel}
                  </Link>
                  .
                </p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7d49cf] to-[#8539ff] px-5 text-base font-black text-white shadow-[0_18px_40px_rgba(125,73,207,0.34)] transition-all duration-200 hover:translate-y-[-1px] active:scale-[0.98]"
                >
                  {continueLabel}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <p className="mt-4 text-center text-[0.72rem] font-medium tracking-[0.02em] text-[#9186a5]">
                  {swipeHint}
                </p>
              </>
            )}
          </div>
        </div>
        <span className="sr-only">{illustrationAlt}</span>
      </div>
    </div>
  );
}