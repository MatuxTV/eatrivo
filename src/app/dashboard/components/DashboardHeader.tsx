"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { LogOut, User, DiamondPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMembershipStatus } from "@/lib/functions";
import { useSession } from "next-auth/react";

interface DashboardHeaderProps {
  onSectionChange: (
    section: "dashboard" | "pantry" | "chatWithRivo" | "profile",
  ) => void;
}

export default function DashboardHeader({
  onSectionChange,
}: DashboardHeaderProps) {
  const { data: session } = useSession();

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-40 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* User Profile Section */}
        <button
          onClick={() => onSectionChange("profile")}
          className="flex items-center gap-3 active:opacity-70 transition-opacity text-left cursor-pointer bg-transparent border-none p-0"
        >
          {session?.user?.image ? (
            <Image
              src={session.user.image}
              alt={session?.user?.name || "User"}
              width={36}
              height={36}
              className="rounded-full ring-2 ring-eatrivo-purple/20"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-eatrivo-purple/10 flex items-center justify-center">
              <User className="w-5 h-5 text-eatrivo-purple" />
            </div>
          )}
          <div>
            <h2 className="text-sm font-bold text-gray-900 truncate max-w-[150px]">
              {session?.user?.name}
            </h2>
            <p
              className={`text-[10px] font-medium capitalize ${getMembershipStatus(session?.user?.membership)}`}
            >
              {session?.user?.membership || "basic"}
            </p>
          </div>
        </button>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {session?.user?.membership === "trainer" && (
            <Link href="/admin">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-gray-500 hover:text-eatrivo-purple hover:bg-eatrivo-purple/10 rounded-full transition-colors"
                title="Admin Panel"
              >
                <DiamondPlus className="w-5 h-5" />
              </Button>
            </Link>
          )}

          <Link href="/signout">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
