import { Navbar } from "@/components/landing/Navbar"
import { Hero } from "@/components/landing/Hero"
import { HowItWorks } from "@/components/landing/HowItWorks"
import { Features } from "@/components/landing/Features"
import { CTA } from "@/components/landing/CTA"
import { Footer } from "@/components/landing/Footer"

export const metadata = {
  title: "EatRivo - AI Asistent pre Zdravé Stravovanie",
  description: "Vytvorte si personalizovaný jedálny plán pomocou AI. Nahrajte nákupný lístok a získajte recepty na mieru.",
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white selection:bg-eatrivo-purple selection:text-white">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}