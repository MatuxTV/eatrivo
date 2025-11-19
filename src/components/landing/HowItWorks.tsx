"use client"

import { motion } from "framer-motion"
import { Upload, Sparkles, ArrowRight } from "lucide-react"

const steps = [
  {
    id: 1,
    title: "Zaregistrujte sa",
    description: "Vytvorte si bezplatný účet a vyplňte základné informácie o vašich cieľoch a preferenciách.",
    icon: Sparkles,
    color: "bg-blue-50 text-blue-600",
  },
  {
    id: 2,
    title: "Spracujeme vaše údaje",
    description: "Naša AI v spolupráci s odborníkmi pripraví ideálnu kombináciu jedál a surovín presne pre vás.",
    icon: Sparkles, // Changed icon to Sparkles or similar to represent processing
    color: "bg-purple-50 text-purple-600",
  },
  {
    id: 3,
    title: "Hotovo!",
    description: "Dostanete hotový nákupný lístok aj s receptami na celý týždeň. Stačí len nakúpiť a variť.",
    icon: ArrowRight,
    color: "bg-green-50 text-green-600",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-gray-50 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4"
          >
            Ako to funguje?
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-gray-600 max-w-2xl mx-auto"
          >
            Cesta k zdravšiemu stravovaniu v troch jednoduchých krokoch
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-blue-200 via-purple-200 to-green-200 z-0"></div>

          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.2 }}
              className="relative z-10 flex flex-col items-center text-center"
            >
              <div className={`w-24 h-24 rounded-2xl ${step.color} flex items-center justify-center shadow-lg mb-6 transition-transform hover:scale-110 duration-300`}>
                <step.icon className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {step.id}. {step.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
