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

export const metadata = {
  title: "EatRivo - Zdravé stravovanie bez komplikácií",
  description:
    "Personalizované jedálne plány a nákupné zoznamy. AI + Nutričný špecialista. Začni zdarma.",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-white selection:bg-eatrivo-purple selection:text-white">
      <Navbar />
      <main>
        <HeroSection />
        <GoalsSection />
        <HowItWorksSection />
        <AppShowcase />
        <Testimonials />
        <PainSolution />
        <FAQ />
        <DownloadCTA />
      </main>
      <Footer />
    </div>
  );
}
