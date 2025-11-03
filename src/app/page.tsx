import Link from "next/link"
import Image from "next/image"
import { Upload, Sparkles } from "lucide-react"

export const metadata = {
  title: "EatRivo - AI Asistent pre Zdravé Stravovanie"
}

export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-white">
      <div className="flex h-full grow flex-col">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md px-4 sm:px-6 py-4">
          <div className="mx-auto max-w-7xl flex items-center justify-between">
            <Link href="/" className="relative h-8 w-32 sm:h-10 sm:w-40">
              <Image
                src="/logo/LOGO_ROW.png"
                alt="EatRivo Logo"
                fill
                className="object-contain"
                priority
              />
            </Link>
            <Link 
              href="/signin" 
              className="bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium text-sm sm:text-base transition-colors"
            >
              Prihlásiť sa
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 bg-gradient-to-b from-purple-50 to-white pt-20">
          {/* Hero Section */}
          <section className="relative overflow-hidden">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24 lg:py-32">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-purple-100 text-eatrivo-purple px-4 py-2 rounded-full text-sm font-medium mb-8">
                  <Sparkles className="w-4 h-4" />
                  AI-powered personalizácia
                </div>
                
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 mb-6">
                  Váš inteligentný
                  <span className="block text-eatrivo-purple mt-2">jedálny asistent</span>
                </h1>
                
                <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-gray-600 leading-relaxed">
                  Nahrajte svoj nákupný lístok a my vám vytvoríme personalizovaný týždenný jedálny plán. 
                  Jednoducho, rýchlo a prispôsobené vašim potrebám.
                </p>

                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link 
                    href="/signin" 
                    className="w-full sm:w-auto rounded-lg bg-eatrivo-purple text-white px-8 py-4 text-base font-semibold shadow-lg hover:bg-eatrivo-purple/90 transition-all hover:shadow-xl"
                  >
                    Začať zadarmo
                  </Link>
                  <Link 
                    href="#how-it-works" 
                    className="w-full sm:w-auto text-base font-semibold text-gray-700 hover:text-eatrivo-purple px-8 py-4"
                  >
                    Ako to funguje →
                  </Link>
                </div>

                {/* Hero Image/Visual */}
                <div className="mt-16 relative">
                  <div className="relative mx-auto max-w-5xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-eatrivo-purple/20 to-purple-300/20 blur-3xl rounded-full"></div>
                    <Image
                      alt="EatRivo Dashboard Preview"
                      className="relative rounded-2xl shadow-2xl ring-1 ring-gray-200"
                      src="https://images.unsplash.com/photo-1498837167922-ddd27525d352?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
                      width={2070}
                      height={1380}
                      priority
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works Section */}
          <section id="how-it-works" className="py-16 sm:py-24 bg-white">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                  Ako to funguje?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Dva jednoduché kroky k vášmu personalizovanému jedálnemu plánu
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16 max-w-4xl mx-auto">
                {/* Step 1 */}
                <div className="relative">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-eatrivo-purple to-purple-600 flex items-center justify-center shadow-lg mb-6">
                      <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                    </div>
                    <div className="absolute top-10 left-1/2 w-full h-0.5 bg-gradient-to-r from-eatrivo-purple/50 to-transparent hidden md:block"></div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                      1. Zaregistrujte sa
                    </h3>
                    <p className="text-gray-600 text-lg">
                      Vytvorte si bezplatný účet a vyplňte základné informácie o vašich cieľoch a preferenciách.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-eatrivo-purple to-purple-600 flex items-center justify-center shadow-lg mb-6">
                      <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                      2. Hotovo
                    </h3>
                    <p className="text-gray-600 text-lg">
                      Už iba počkate do kým Váš trenér nahrá nákupný lístok a AI vám vytvorí personalizovaný jedálny plán na celý týždeň.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-16 sm:py-24 bg-gray-50">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="text-center mb-16">
                <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                  Prečo EatRivo?
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Moderné riešenie pre efektívne plánovanie stravovania
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  {
                    icon: "🎯",
                    title: "Personalizácia",
                    description: "Jedálny plán prispôsobený vašim cieľom a preferenciám"
                  },
                  {
                    icon: "⚡",
                    title: "Rýchle a jednoduché",
                    description: "Vytvorenie plánu trvá len pár sekúnd"
                  },
                  {
                    icon: "💰",
                    title: "Šetrí peniaze",
                    description: "Využite všetky ingrediencie z vášho nákupu"
                  },
                  {
                    icon: "📊",
                    title: "Nutričné hodnoty",
                    description: "Sledujte kalórie, bielkoviny a ďalšie makrá"
                  }
                ].map((feature, index) => (
                  <div 
                    key={index} 
                    className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="text-4xl mb-4">{feature.icon}</div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-16 sm:py-24 bg-gradient-to-br from-eatrivo-purple to-purple-700">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                Pripravení začať?
              </h2>
              <p className="text-lg sm:text-xl text-purple-100 max-w-2xl mx-auto mb-10">
                Prihláste sa teraz a získajte svoj prvý personalizovaný jedálny plán zadarmo.
              </p>
              <Link 
                href="/signin" 
                className="inline-block rounded-lg bg-white text-eatrivo-purple px-8 py-4 text-base font-semibold shadow-lg hover:bg-gray-50 transition-all hover:shadow-xl"
              >
                Začať zadarmo
              </Link>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="bg-gray-900 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div>
                <Link href="/" className="relative h-10 w-40 mb-4 block">
                  <Image
                    src="/logo/LOGO_ROW.png"
                    alt="EatRivo Logo"
                    fill
                    className="object-contain brightness-0 invert"
                  />
                </Link>
                <p className="text-gray-400 text-sm">
                  AI asistent pre inteligentné plánovanie stravovania.
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold mb-4">Produkt</h3>
                <ul className="space-y-2">
                  <li><a href="#how-it-works" className="text-gray-400 hover:text-white text-sm">Ako to funguje</a></li>
                  <li><Link href="/signin" className="text-gray-400 hover:text-white text-sm">Prihlásiť sa</Link></li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-4">Právne</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-white text-sm">Podmienky používania</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white text-sm">Ochrana osobných údajov</a></li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-gray-800 pt-8">
              <p className="text-center text-gray-400 text-sm">
                © {new Date().getFullYear()} EatRivo. Všetky práva vyhradené.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}