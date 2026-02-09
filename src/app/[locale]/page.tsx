import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { GoalsSection } from "@/components/landing/GoalsSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { AppShowcase } from "@/components/landing/AppShowcase";
import { Testimonials } from "@/components/landing/Testimonials";
import { PainSolution } from "@/components/landing/PainSolution";
import { FAQ } from "@/components/landing/FAQ";
import { DownloadCTA } from "@/components/landing/DownloadCTA";
import { Footer } from "@/components/landing/Footer";
import { isLocale, type Locale } from "@/i18n/routing";
import { Pricing } from "@/components/landing/Pricing";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "sk";
  const t = await getTranslations({ locale, namespace: "landing" });

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default function Home() {
  return (
    <div className="min-h-screen bg-eatrivo-white-primary selection:bg-eatrivo-purple selection:text-white">
      <Navbar />
      <main>
        <HeroSection />
        <GoalsSection />
        <HowItWorksSection />
        <AppShowcase />
        <Pricing />
        <PainSolution />
        <FAQ />
        <DownloadCTA />
      </main>
      <Footer />
    </div>
  );
}
