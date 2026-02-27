import { motion } from "framer-motion";
import {
  Plus,
  Users,
  UserCircle,
  Mail,
  BarChart3,
  FileText,
  Bell,
  type LucideIcon,
} from "lucide-react";

type TabId =
  | "upload"
  | "users"
  | "profiles"
  | "emails"
  | "notifications"
  | "templates"
  | "analytics";

interface Tab {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

interface AdminTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: Tab[] = [
  { id: "upload", label: "Vytvoriť zoznam", icon: Plus },
  { id: "users", label: "Používatelia", icon: Users },
  { id: "profiles", label: "Profily", icon: UserCircle },
  { id: "emails", label: "Emaily", icon: Mail },
  { id: "notifications", label: "Notifikácie", icon: Bell },
  { id: "templates", label: "Šablóny", icon: FileText },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

export default function AdminTabs({ activeTab, onTabChange }: AdminTabsProps) {
  return (
    <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex p-1 bg-white rounded-xl border border-gray-200 shadow-sm w-full sm:w-fit overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="relative px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-initial justify-center sm:justify-start whitespace-nowrap"
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden xs:inline sm:inline">{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 border border-eatrivo-purple/20 rounded-lg"
                transition={{ type: "spring", duration: 0.5 }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export type { TabId };
