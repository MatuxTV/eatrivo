"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function CTA() {
  return (
    <section className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative rounded-[2.5rem] overflow-hidden px-6 py-16 sm:px-16 sm:py-24 text-center bg-gray-900 shadow-2xl">
          
          {/* Decorative Elements - Subtle Glows instead of Circles */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-64 h-64 eatrivo-black/20 rounded-full blur-3xl -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-1/4 w-64 h-64 eatrivo-black/10 rounded-full blur-3xl translate-y-1/2"></div>
          </div>

          <div className="relative z-10 max-w-3xl mx-auto">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight"
            >
              Pripravení zmeniť svoje stravovanie?
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg sm:text-xl text-gray-300 mb-10 leading-relaxed"
            >
              Pridajte sa k tisíckam spokojných užívateľov a nechajte AI, aby sa postarala o váš jedálniček.
              Prvý týždeň je úplne zadarmo.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Link href="/signin">
                <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100 rounded-full px-10 h-16 text-lg font-semibold shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1">
                  Začať zadarmo
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </motion.div>
            
            <p className="mt-6 text-sm text-gray-400 opacity-80">
              Bez nutnosti kreditnej karty. Zrušenie kedykoľvek.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
