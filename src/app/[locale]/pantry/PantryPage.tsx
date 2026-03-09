"use client";

import { CakeSlice } from "lucide-react";
import ComingSoonPage from "@/app/home/premium/ComingSoonPage";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export default function PantryPage() {
  const t = useTranslations("home.comingSoon");

  return (
    <ComingSoonPage
      titleKey="pantry.title"
      descriptionKey="pantry.description"
      icon={<CakeSlice className="w-6 h-6 text-eatrivo-purple" />}
      rivoImage="/rivo/RIVO3-remove.png"
      gradient="bg-gradient-to-br from-orange-400 to-pink-400"
      badgeKey="pantry.badge"
      features={[
        t("pantry.tags.tag1"),
        t("pantry.tags.tag2"),
        t("pantry.tags.tag3"),
      ]}
      ctaLabelKey="pantry.cta"
      onCtaClick={() => {
        toast.success(
          "Upozornenie nastavené! Dáme ti vedieť hneď ako to spustíme. 🔔",
        );
      }}
    />
  );
}
