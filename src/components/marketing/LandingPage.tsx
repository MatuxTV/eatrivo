import type { Locale } from "@/i18n/routing";

import CounterSection from "./CounterSection";
import ExpirySection from "./ExpirySection";
import FaqSection from "./FaqSection";
import FillSection from "./FillSection";
import FinalCta from "./FinalCta";
import Footer from "./Footer";
import GoalSection from "./GoalSection";
import Hero from "./Hero";
import Nav from "./Nav";
import PricingSection from "./PricingSection";
import RivoSection from "./RivoSection";

type LandingPageProps = {
  locale: Locale;
};

export default async function LandingPage({ locale }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-mk-bg font-brand text-mk-text">
      <Nav locale={locale} />
      <main>
        <Hero locale={locale} />
        <CounterSection locale={locale} />
        <FillSection locale={locale} />
        <ExpirySection locale={locale} />
        <GoalSection locale={locale} />
        <RivoSection locale={locale} />
        <PricingSection locale={locale} />
        <FaqSection locale={locale} />
        <FinalCta locale={locale} />
      </main>
      <Footer locale={locale} />
    </div>
  );
}
