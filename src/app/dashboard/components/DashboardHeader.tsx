"use client";

import Link from "next/link";
import Image from "next/image";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMembershipStatus } from "@/lib/functions";
import type { Session } from "next-auth";

interface DashboardHeaderProps {
  session: Session | null;
}

export default function DashboardHeader({ session }: DashboardHeaderProps) {
  return (
    <div className="md:hidden fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-40 px-4 py-3">
      <div className="flex items-center justify-between">
        <Link href="/profile" className="flex items-center gap-3 active:opacity-70 transition-opacity">
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
            <p className={`text-[10px] font-medium capitalize ${getMembershipStatus(session?.user?.membership)}`}>
              {session?.user?.membership || "basic"}
            </p>
          </div>
        </Link>
        <Link href="/signout">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full">
            <LogOut className="w-5 h-5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
