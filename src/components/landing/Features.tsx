"use client"

import { motion } from "framer-motion"
import { Target, Zap, Wallet, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    icon: Target,
    title: "Personalizácia",
    description: "Jedálny plán prispôsobený vašim cieľom, či už chcete schudnúť, nabrať svaly alebo sa len zdravo stravovať.",
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  {
    icon: Zap,
    title: "Rýchlosť",
    description: "Zabudnite na hodiny plánovania. S našou AI máte hotový plán za pár sekúnd.",
    color: "text-yellow-500",
    bg: "bg-yellow-50",
  },
  {
    icon: Wallet,
    title: "Úspora peňazí",
    description: "Využite ingrediencie, ktoré už máte doma. Minimalizujte odpad a ušetrite na nákupoch.",
    color: "text-green-500",
    bg: "bg-green-50",
  },
  {
    icon: Activity,
    title: "Nutričný prehľad",
    description: "Automatický výpočet kalórií a makroživín pre každé jedlo. Majte svoje zdravie pod kontrolou.",
    color: "text-red-500",
    bg: "bg-red-50",
  },
]

export function Features() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4"
          >
            Prečo si vybrať EatRivo?
          </motion.h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Všetko, čo potrebujete pre efektívne a chutné stravovanie
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            > 
              <Card className="h-full bg-primary-background border-3 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardHeader>
                  <div className={`w-14 h-14 rounded-xl ${feature.bg} ${feature.color} flex items-center justify-center mb-4`}>
                    <feature.icon className="w-7 h-7" />
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
