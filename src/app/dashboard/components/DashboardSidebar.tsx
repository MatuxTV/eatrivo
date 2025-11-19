"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { User, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMembershipStatus } from "@/lib/functions";
import type { Session } from "next-auth";

interface DashboardSidebarProps {
  session: Session | null;
}

export default function DashboardSidebar({ session }: DashboardSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    // { href: "/meal-plans", label: "Jedálne plány", icon: UtensilsCrossed },
    // { href: "/profile", label: "Profil", icon: User },
    // { href: "/settings", label: "Nastavenia", icon: Settings },
  ];

  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="hidden md:flex w-64 bg-white border-r border-gray-100 flex-col h-screen sticky top-0"
    >
      {/* User Profile Section */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              {session?.user?.image ? (
                <Image
                  src={session.user.image}
                  alt={session?.user?.name || "User"}
                  width={48}
                  height={48}
                  className="rounded-full ring-2 ring-eatrivo-purple/20"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-eatrivo-purple/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-eatrivo-purple" />
                </div>
              )}
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-gray-900 truncate">
                {session?.user?.name}
              </h2>
              <p
                className={`text-xs capitalize ${getMembershipStatus(
                  session?.user?.membership
                )}`}
              >
                {session?.user?.membership || "basic"} člen
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-8 bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700"
              asChild
            >
              <Link href="/profile">
                <User className="w-3 h-3 mr-1.5" />
                Profil
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              asChild
            >
              <Link href="/signout">
                <LogOut className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${
                  isActive
                    ? "bg-eatrivo-purple/10 text-eatrivo-purple"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }
              `}
            >
              <item.icon
                className={`w-4 h-4 mr-3 ${
                  isActive ? "text-eatrivo-purple" : "text-gray-400"
                }`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </motion.div>
  );
}
