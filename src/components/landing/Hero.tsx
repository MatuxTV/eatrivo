"use client"

import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Sparkles, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import { usePathname } from "next/navigation"
import { getLocaleFromPathname } from "@/i18n/routing"

export function Hero() {
  const t = useTranslations("landing")
  const tCommon = useTranslations("common")
  const pathname = usePathname()
  const locale = getLocaleFromPathname(pathname)

  return (
    <section className="relative pt-32 pb-16 md:pt-48 md:pb-32 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-eatrivo-purple/10 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-blob" />
        <div className="absolute top-40 left-0 w-[500px] h-[500px] bg-eatrivo-pink/10 rounded-full blur-3xl opacity-50 mix-blend-multiply animate-blob animation-delay-2000" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          
          {/* Text Content */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex-1 text-center lg:text-left"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-white border border-gray-200 shadow-sm px-4 py-2 rounded-full text-sm font-medium text-eatrivo-purple mb-8"
            >
              <Sparkles className="w-4 h-4" />
              <span>{t("hero.badge")}</span>
            </motion.div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-gray-900 mb-6 leading-[1.1]">
              {t("hero.titleLine1")} <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-eatrivo-purple to-eatrivo-pink">
                {t("hero.titleAccent")}
              </span>
            </h1>
            
            <p className="mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              {t("hero.description")}
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link href={`/${locale}/signin`}>
                <Button size="lg" className="bg-eatrivo-purple hover:bg-eatrivo-purple/90 text-white rounded-full px-8 h-14 text-lg shadow-lg hover:shadow-eatrivo-purple/25 transition-all">
                  {tCommon("startFree")}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button variant="ghost" size="lg" className="rounded-full h-14 text-lg text-gray-600 hover:text-eatrivo-purple">
                  {t("navbar.howItWorks")}
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Visual Content */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex-1 w-full max-w-lg lg:max-w-none"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-eatrivo-purple to-eatrivo-pink rounded-[2rem] rotate-3 opacity-20 blur-2xl"></div>
              <div className="relative bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden aspect-[4/3] lg:aspect-square">
                 {/* Placeholder for UI Mockup or Image */}
                 <Image
                    src="https://images.unsplash.com/photo-1498837167922-ddd27525d352?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
                    alt="App Dashboard"
                    fill
                    className="object-cover"
                    priority
                 />
                 
                 {/* Floating Card 1 */}
                 <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="absolute bottom-8 left-8 bg-white/90 backdrop-blur p-4 rounded-2xl shadow-xl border border-white/50 max-w-[200px]"
                 >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                        🥗
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">{t("hero.sampleMealLabel")}</div>
                          <div className="text-sm font-bold text-gray-900">{t("hero.sampleMealTitle")}</div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-green-500 h-full w-[80%]"></div>
                    </div>
                 </motion.div>

                 {/* Floating Card 2 */}
                 <motion.div 
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="absolute top-8 right-8 bg-white/90 backdrop-blur p-4 rounded-2xl shadow-xl border border-white/50"
                 >
                    <div className="text-center">
                      <div className="text-xs text-gray-500 uppercase tracking-wider">{t("hero.sampleCaloriesLabel")}</div>
                      <div className="text-2xl font-bold text-eatrivo-purple">1,850</div>
                      <div className="text-xs text-green-600 font-medium">{t("hero.sampleGoal")}</div>
                    </div>
                 </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
