"use client"

import { motion } from "framer-motion"
import { Target, Zap, Wallet, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslations } from "next-intl"

export function Features() {
  const t = useTranslations("landing")

  const features = [
    {
      icon: Target,
      title: t("features.items.personalization.title"),
      description: t("features.items.personalization.description"),
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    {
      icon: Zap,
      title: t("features.items.speed.title"),
      description: t("features.items.speed.description"),
      color: "text-yellow-500",
      bg: "bg-yellow-50",
    },
    {
      icon: Wallet,
      title: t("features.items.savings.title"),
      description: t("features.items.savings.description"),
      color: "text-green-500",
      bg: "bg-green-50",
    },
    {
      icon: Activity,
      title: t("features.items.nutrition.title"),
      description: t("features.items.nutrition.description"),
      color: "text-red-500",
      bg: "bg-red-50",
    },
  ]

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
            {t("features.title")}
          </motion.h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t("features.subtitle")}
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
