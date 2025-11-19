"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { motion } from "framer-motion";

export default function MobileNavigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard },
    // { href: "/meal-plans", label: "Plány", icon: UtensilsCrossed },
    // { href: "/profile", label: "Profil", icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center justify-center w-full h-full"
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-active"
                  className="absolute top-0 w-12 h-1 bg-eatrivo-purple rounded-b-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <item.icon
                className={`w-5 h-5 mb-1 transition-colors duration-200 ${
                  isActive ? "text-eatrivo-purple" : "text-gray-400"
                }`}
              />
              <span
                className={`text-[10px] font-medium transition-colors duration-200 ${
                  isActive ? "text-eatrivo-purple" : "text-gray-500"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
