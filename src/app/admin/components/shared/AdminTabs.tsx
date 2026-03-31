"use client";

import {
  Mail,
  BarChart3,
  Bell,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

type TabId =
  | "emails"
  | "notifications"
  | "analytics";

interface Tab {
  id: TabId;
  icon: LucideIcon;
}

interface AdminTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: Tab[] = [
  { id: "analytics", icon: BarChart3 },
  { id: "emails", icon: Mail },
  { id: "notifications", icon: Bell },
];

export default function AdminTabs({ activeTab, onTabChange }: AdminTabsProps) {
  const t = useTranslations("admin.dashboard.tabs");

  return (
    <div className="mb-5 sm:mb-8">
      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 sm:px-4 ${
              activeTab === tab.id
                ? "border border-eatrivo-purple/20 bg-eatrivo-purple/5 text-eatrivo-purple"
                : "border border-transparent bg-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{t(tab.id)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export type { TabId };
