import Link from "next/link"
import Image from "next/image"
import { CheckIcon, MenuIcon } from "lucide-react"

export const metadata = {
  title: "EatRivo - Zdravé stravovanie a doručenie jedla"
}

export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-white font-public-sans">
      <div className="flex h-full grow flex-col">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <Link href="/" className=" text-eatrivo-purple font-bold text-2xl">
            EatRivo
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#" className="text-gray-600 hover:text-eatrivo-purple font-medium">Domov</Link>
            <Link href="#" className="text-gray-600 hover:text-eatrivo-purple font-medium">Menu</Link>
            <Link href="#" className="text-gray-600 hover:text-eatrivo-purple font-medium">Ceny</Link>
            <Link href="#" className="text-gray-600 hover:text-eatrivo-purple font-medium">O nás</Link>
          </nav>
          <div className="flex items-center gap-3">
            <button className="text-gray-600 hover:text-eatrivo-purple md:hidden">
              <MenuIcon className="h-6 w-6" />
            </button>
            <Link href="/signin" className="bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white px-4 py-2 rounded-md font-medium">
              Prihlásiť sa
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 pt-20">
          {/* Hero Section */}
          <div className="relative bg-eatrivo-purple text-white">
            <div className="absolute inset-0">
              <Image
                alt="Healthy food background" 
                className="h-full w-full object-cover opacity-20" 
                src="https://images.unsplash.com/photo-1498837167922-ddd27525d352?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
                width={2070}
                height={1380}
                priority
              />
            </div>
            <div className="relative mx-auto max-w-7xl px-6 py-32 sm:py-48 lg:py-56 text-center">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                Zdravé Jedlo Priamo K Vám Domov
              </h1>
              <p className="mt-6 max-w-3xl mx-auto text-lg md:text-xl text-purple-200">
                Objavte chuť zdravého stravovania s našimi personalizovanými jedálnymi plánmi a rýchlym doručením čerstvých ingrediencií priamo k vášmu domu.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6">
                <Link 
                  href="/signin" 
                  className="rounded-md bg-white text-eatrivo-purple px-8 py-3 text-base font-semibold shadow-sm hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Začnite Dnes
                </Link>
                <Link href="#plans" className="text-base font-semibold leading-6 text-white">
                  Pozrite si Naše Plány <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Community Section */}
          <section className="py-12 bg-white">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl text-center">
                Čo hovoria naši zákazníci
              </h2>
              <p className="mt-4 text-lg leading-8 text-gray-600 text-center max-w-2xl mx-auto">
                Pridajte sa k tisíckam spokojných zákazníkov a začnite svoju cestu k zdravšiemu životnému štýlu.
              </p>
              <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    name: "Mária",
                    time: "Pred 2 hodinami",
                    message: "Práve som dostala svoj týždenný box zdravých jedál, všetko vyzerá fantasticky! #zdravéstravovanie #eatrivo",
                    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  },
                  {
                    name: "Peter",
                    time: "Pred 4 hodinami", 
                    message: "Konečne jedlá, ktoré chutia aj vyzerajú skvele! Ďakujem EatRivo za skvelé recepty. #fit #healthy",
                    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  },
                  {
                    name: "Anna",
                    time: "Pred 6 hodinami",
                    message: "Potrebovala som zmeniť stravovanie a EatRivo mi v tom veľmi pomohlo. Odporúčam! #zmena #zdravie",
                    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  }
                ].map((testimonial, index) => (
                  <div key={index} className="flex w-full flex-col items-start justify-start gap-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow duration-300 hover:shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="relative w-12 h-12 rounded-full overflow-hidden">
                        <Image
                          src={testimonial.avatar}
                          alt={`${testimonial.name} avatar`}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-black text-base font-bold leading-normal">{testimonial.name}</p>
                        <p className="text-gray-500 text-sm font-normal leading-normal">{testimonial.time}</p>
                      </div>
                    </div>
                    <p className="text-gray-700 text-base font-normal leading-relaxed">&ldquo;{testimonial.message}&rdquo;</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Pricing Section */}
          <section id="plans" className="bg-gray-50 py-20">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="mx-auto max-w-2xl sm:text-center">
                <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  Jednoduché a transparentné ceny
                </h2>
                <p className="mt-6 text-lg leading-8 text-gray-600">
                  Vyberte si plán, ktorý vám najviac vyhovuje a začnite svoju cestu k zdravšiemu stravovaniu ešte dnes.
                </p>
              </div>
              
              <div className="mx-auto mt-16 max-w-2xl rounded-3xl ring-1 ring-gray-200 sm:mt-20 lg:mx-0 lg:flex lg:max-w-none">
                <div className="p-8 sm:p-10 lg:flex-auto">
                  <h3 className="text-2xl font-bold tracking-tight text-gray-900">Mesačný plán</h3>
                  <p className="mt-6 text-base leading-7 text-gray-600">
                    Získajte prístup k našim personalizovaným jedálnym plánom a čerstvým ingredienciám doručeným priamo k vám domov.
                  </p>
                  <div className="mt-10 flex items-center gap-x-4">
                    <h4 className="flex-none text-sm font-semibold leading-6 text-eatrivo-purple">Čo je zahrnuté</h4>
                    <div className="h-px flex-auto bg-gray-200"></div>
                  </div>
                  <ul className="mt-8 grid grid-cols-1 gap-4 text-sm leading-6 text-gray-600 sm:grid-cols-2 sm:gap-6" role="list">
                    {[
                      "Personalizované jedálne plány",
                      "Čerstvé ingrediencie",
                      "Nutričné poradenstvo", 
                      "Rýchle doručenie"
                    ].map((feature, index) => (
                      <li key={index} className="flex gap-x-3">
                        <CheckIcon className="h-6 w-5 flex-none text-eatrivo-purple" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="-mt-2 p-2 lg:mt-0 lg:w-full lg:max-w-md lg:flex-shrink-0">
                  <div className="rounded-2xl bg-gray-100 py-10 text-center ring-1 ring-inset ring-gray-900/5 lg:flex lg:flex-col lg:justify-center lg:py-16">
                    <div className="mx-auto max-w-xs px-8">
                      <p className="text-base font-semibold text-gray-600">Mesačne</p>
                      <p className="mt-6 flex items-baseline justify-center gap-x-2">
                        <span className="text-5xl font-bold tracking-tight text-gray-900">25€</span>
                        <span className="text-sm font-semibold leading-6 tracking-wide text-gray-600">/mesiac</span>
                      </p>
                      <Link 
                        href="/signin" 
                        className="mt-10 block w-full rounded-md bg-eatrivo-purple px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-eatrivo-purple/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eatrivo-purple"
                      >
                        Získať prístup
                      </Link>
                      <p className="mt-6 text-xs leading-5 text-gray-600">
                        Fakturácia prebieha mesačne. Zrušiť môžete kedykoľvek.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mx-auto mt-8 max-w-2xl rounded-3xl ring-1 ring-eatrivo-purple sm:mt-12 lg:mx-0 lg:flex lg:max-w-none relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-eatrivo-purple text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  NAJLEPŠIA VOĽBA
                </div>
                <div className="p-8 sm:p-10 lg:flex-auto">
                  <h3 className="text-2xl font-bold tracking-tight text-gray-900">Ročný plán</h3>
                  <p className="mt-6 text-base leading-7 text-gray-600">
                    Ušetrite s naším ročným plánom a zaviažte sa k dlhodobej zmene. Získajte všetky výhody mesačného plánu za zvýhodnenú cenu.
                  </p>
                  <div className="mt-10 flex items-center gap-x-4">
                    <h4 className="flex-none text-sm font-semibold leading-6 text-eatrivo-purple">
                      Všetko z mesačného plánu, plus
                    </h4>
                    <div className="h-px flex-auto bg-gray-200"></div>
                  </div>
                  <ul className="mt-8 grid grid-cols-1 gap-4 text-sm leading-6 text-gray-600 sm:grid-cols-2 sm:gap-6" role="list">
                    {[
                      "Prioritná podpora",
                      "Exkluzívne recepty"
                    ].map((feature, index) => (
                      <li key={index} className="flex gap-x-3">
                        <CheckIcon className="h-6 w-5 flex-none text-eatrivo-purple" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="-mt-2 p-2 lg:mt-0 lg:w-full lg:max-w-md lg:flex-shrink-0">
                  <div className="rounded-2xl bg-gray-100 py-10 text-center ring-1 ring-inset ring-gray-900/5 lg:flex lg:flex-col lg:justify-center lg:py-16">
                    <div className="mx-auto max-w-xs px-8">
                      <p className="text-base font-semibold text-gray-600">Ročne</p>
                      <p className="mt-6 flex items-baseline justify-center gap-x-2">
                        <span className="text-5xl font-bold tracking-tight text-gray-900">250€</span>
                        <span className="text-sm font-semibold leading-6 tracking-wide text-gray-600">/rok</span>
                      </p>
                      <Link 
                        href="/signin" 
                        className="mt-10 block w-full rounded-md bg-eatrivo-purple px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-eatrivo-purple/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eatrivo-purple"
                      >
                        Získať prístup
                      </Link>
                      <p className="mt-6 text-xs leading-5 text-gray-600">
                        Ušetrite 50€ v porovnaní s mesačnou platbou.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="bg-black text-white">
          <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
            <div className="xl:grid xl:grid-cols-3 xl:gap-8">
              <div className="space-y-8 xl:col-span-1">
                <Link href="/" className="text-white font-bold text-3xl">EatRivo</Link>
                <p className="text-gray-400 text-base">
                  Premeňte svoje stravovanie s našou podporou a čerstvými ingredienciami.
                </p>
                <div className="flex space-x-6">
                  {/* Social Media Icons - You can add actual social links */}
                  <a href="#" className="text-gray-400 hover:text-white">
                    <span className="sr-only">Facebook</span>
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                    </svg>
                  </a>
                </div>
              </div>
              <div className="mt-12 grid grid-cols-2 gap-8 xl:mt-0 xl:col-span-2">
                <div className="md:grid md:grid-cols-2 md:gap-8">
                  <div>
                    <h3 className="text-sm font-semibold leading-6 text-white">Služby</h3>
                    <ul className="mt-6 space-y-4" role="list">
                      <li><a href="#" className="text-base leading-6 text-gray-400 hover:text-white">Jedálne plány</a></li>
                      <li><a href="#" className="text-base leading-6 text-gray-400 hover:text-white">Doručenie</a></li>
                      <li><a href="#" className="text-base leading-6 text-gray-400 hover:text-white">Nutričné poradenstvo</a></li>
                    </ul>
                  </div>
                  <div className="mt-10 md:mt-0">
                    <h3 className="text-sm font-semibold leading-6 text-white">Podpora</h3>
                    <ul className="mt-6 space-y-4" role="list">
                      <li><a href="#" className="text-base leading-6 text-gray-400 hover:text-white">Ceny</a></li>
                      <li><a href="#" className="text-base leading-6 text-gray-400 hover:text-white">Časté otázky</a></li>
                      <li><a href="#" className="text-base leading-6 text-gray-400 hover:text-white">Kontakt</a></li>
                    </ul>
                  </div>
                </div>
                <div className="md:grid md:grid-cols-2 md:gap-8">
                  <div>
                    <h3 className="text-sm font-semibold leading-6 text-white">Spoločnosť</h3>
                    <ul className="mt-6 space-y-4" role="list">
                      <li><a href="#" className="text-base leading-6 text-gray-400 hover:text-white">O nás</a></li>
                      <li><a href="#" className="text-base leading-6 text-gray-400 hover:text-white">Blog</a></li>
                      <li><a href="#" className="text-base leading-6 text-gray-400 hover:text-white">Kariéra</a></li>
                    </ul>
                  </div>
                  <div className="mt-10 md:mt-0">
                    <h3 className="text-sm font-semibold leading-6 text-white">Právne</h3>
                    <ul className="mt-6 space-y-4" role="list">
                      <li><a href="#" className="text-base leading-6 text-gray-400 hover:text-white">Podmienky používania</a></li>
                      <li><a href="#" className="text-base leading-6 text-gray-400 hover:text-white">Ochrana osobných údajov</a></li>
                      <li><a href="#" className="text-base leading-6 text-gray-400 hover:text-white">Kontakt</a></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-12 border-t border-white/10 pt-8">
              <p className="text-base leading-5 text-gray-400 text-center">
                © 2024 EatRivo. Všetky práva vyhradené.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}