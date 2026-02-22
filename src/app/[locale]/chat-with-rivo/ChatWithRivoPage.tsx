"use client";

import { MessageCircleHeart } from "lucide-react";
import ComingSoonPage from "@/app/dashboard/components/ComingSoonPage";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export default function ChatWithRivoPage() {
  const t = useTranslations("dashboard.comingSoon");

  return (
    <ComingSoonPage
      titleKey="chatWithRivo.title"
      descriptionKey="chatWithRivo.description"
      icon={<MessageCircleHeart className="w-6 h-6 text-eatrivo-purple" />}
      rivoImage="/rivo/RIVO4-remove.png"
      gradient="bg-gradient-to-br from-purple-400 to-violet-400"
      badgeKey="chatWithRivo.badge"
      features={[
        t("chatWithRivo.tags.tag1"),
        t("chatWithRivo.tags.tag2"),
        t("chatWithRivo.tags.tag3"),
      ]}
      ctaLabelKey="chatWithRivo.cta"
      onCtaClick={() => {
        toast.success(
          "Upozornenie nastavené! Dáme ti vedieť hneď ako to spustíme. 🔔",
        );
      }}
    />
  );
}
